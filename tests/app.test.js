const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../app');

function createFakeDb() {
  const fakeProfiles = [
    { id: 1, name: 'Admin', email: 'admin@example.com', role: 'admin', entries: 5, joined: '2025-01-01' },
    { id: 2, name: 'Huzefa', email: 'user@example.com', entries: 3, joined: '2025-01-02' },
    { id: 3, name: 'New User', email: 'unverified@example.com', entries: 0, joined: '2025-01-03', is_email_verified: false }
  ];

  return {
    select(...columns) {
      return {
        from(table) {
          return {
            where(field, operator, value) {
              const columnName = typeof field === 'object' ? Object.keys(field)[0] : field;
              const matchValue = typeof field === 'object' ? field[columnName] : value;

              if (table === 'user_auth') {
                if (matchValue === 'user@example.com') {
                  return Promise.resolve([{ email: 'user@example.com', hash: 'stored-hash' }]);
                }
                if (matchValue === 'admin@example.com') {
                  return Promise.resolve([{ email: 'admin@example.com', hash: 'stored-hash' }]);
                }
                if (matchValue === 'unverified@example.com') {
                  return Promise.resolve([{ email: 'unverified@example.com', hash: 'stored-hash' }]);
                }
                return Promise.resolve([]);
              }

              if (table === 'user_profiles') {
                const rows = fakeProfiles.filter((profile) => String(profile[columnName]) === String(matchValue));
                return Promise.resolve(columns[0] === '*' ? rows : rows.map((row) => row));
              }

              return Promise.resolve([]);
            }
          };
        }
      };
    },
    transaction(handler) {
      const trx = function transactionTable(table) {
        return {
          select() {
            return {
              where({ id }) {
                const rows = fakeProfiles.filter((profile) => String(profile.id) === String(id));
                return Promise.resolve(rows);
              }
            };
          },
          returning() {
            return {
              insert() {
                return Promise.resolve([
                  { id: 3, name: 'New User', email: 'new@example.com', entries: 0, joined: '2025-01-03' }
                ]);
              }
            };
          },
          where(criteria) {
            return {
              del() {
                if (table === 'user_profiles') {
                  const index = fakeProfiles.findIndex((profile) => String(profile.id) === String(criteria.id));
                  if (index >= 0) {
                    fakeProfiles.splice(index, 1);
                  }
                }
                return Promise.resolve(1);
              }
            };
          }
        };
      };

      trx.insert = () => ({
        into() {
          return {
            returning() {
              return Promise.resolve([{ email: 'new@example.com' }]);
            }
          };
        }
      });

      return handler(trx);
    }
  };
}

function createFakeImageDb() {
  const tableFn = () => ({
    where() {
      return {
        increment() {
          return {
            returning() {
              return Promise.resolve([{ entries: 4 }]);
            }
          };
        }
      };
    }
  });

  tableFn.select = createFakeDb().select;
  tableFn.transaction = createFakeDb().transaction;
  return tableFn;
}

const fakeBcrypt = {
  compareSync(password) {
    return password === 'secret123';
  },
  hashSync() {
    return 'hashed-password';
  }
};

test('POST /signin returns a token and user profile for valid credentials', async () => {
  const app = createApp({
    db: createFakeDb(),
    bcryptLib: fakeBcrypt,
    jwtSecret: 'test-secret'
  });

  const response = await request(app)
    .post('/signin')
    .send({ email: 'user@example.com', password: 'secret123' });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.email, 'user@example.com');
  assert.deepEqual(response.body.user.permissions, []);
  assert.ok(response.body.token);
});

test('GET /profile/:id blocks requests without a JWT token', async () => {
  const app = createApp({
    db: createFakeDb(),
    bcryptLib: fakeBcrypt,
    jwtSecret: 'test-secret'
  });

  const response = await request(app).get('/profile/2');

  assert.equal(response.status, 401);
});

test('POST /signin blocks password login until email is verified', async () => {
  const app = createApp({
    db: createFakeDb(),
    bcryptLib: fakeBcrypt,
    jwtSecret: 'test-secret'
  });

  const response = await request(app)
    .post('/signin')
    .send({ email: 'unverified@example.com', password: 'secret123' });

  assert.equal(response.status, 403);
  assert.equal(response.body, 'Please verify your email before signing in');
});

test('GET /profile/:id allows the signed-in user to read their own profile', async () => {
  const app = createApp({
    db: createFakeDb(),
    bcryptLib: fakeBcrypt,
    jwtSecret: 'test-secret'
  });

  const signinResponse = await request(app)
    .post('/signin')
    .send({ email: 'user@example.com', password: 'secret123' });

  const response = await request(app)
    .get('/profile/2')
    .set('Authorization', `Bearer ${signinResponse.body.token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.id, 2);
});

test('PUT /image rejects updates for another user when the token belongs to a regular user', async () => {
  const app = createApp({
    db: createFakeImageDb(),
    bcryptLib: fakeBcrypt,
    jwtSecret: 'test-secret'
  });

  const signinResponse = await request(app)
    .post('/signin')
    .send({ email: 'user@example.com', password: 'secret123' });

  const response = await request(app)
    .put('/image')
    .set('Authorization', `Bearer ${signinResponse.body.token}`)
    .send({ id: 1 });

  assert.equal(response.status, 403);
});

test('POST /signin rate limit returns 429 after too many attempts', async () => {
  const app = createApp({
    db: createFakeDb(),
    bcryptLib: fakeBcrypt,
    jwtSecret: 'test-secret',
    signinLimiterConfig: {
      windowMs: 60 * 1000,
      max: 1,
      message: 'Too many sign-in attempts. Please try again later.'
    }
  });

  await request(app)
    .post('/signin')
    .send({ email: 'user@example.com', password: 'wrong-password' });

  const response = await request(app)
    .post('/signin')
    .send({ email: 'user@example.com', password: 'wrong-password' });

  assert.equal(response.status, 429);
});

test('GET /docs.json exposes the Swagger document', async () => {
  const app = createApp({
    db: createFakeDb(),
    bcryptLib: fakeBcrypt,
    jwtSecret: 'test-secret'
  });

  const response = await request(app).get('/docs.json');

  assert.equal(response.status, 200);
  assert.equal(response.body.info.title, 'Ocula Server API');
});

test('DELETE /admin/users/:id allows admin to remove another user', async () => {
  const app = createApp({
    db: createFakeDb(),
    bcryptLib: fakeBcrypt,
    jwtSecret: 'test-secret'
  });

  const signinResponse = await request(app)
    .post('/signin')
    .send({ email: 'admin@example.com', password: 'secret123' });

  assert.deepEqual(signinResponse.body.user.permissions, ['view_users', 'delete_users']);

  const response = await request(app)
    .delete('/admin/users/2')
    .set('Authorization', `Bearer ${signinResponse.body.token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.deletedUser.email, 'user@example.com');
});

test('GET /admin/users blocks regular users without the view_users permission', async () => {
  const app = createApp({
    db: createFakeDb(),
    bcryptLib: fakeBcrypt,
    jwtSecret: 'test-secret'
  });

  const signinResponse = await request(app)
    .post('/signin')
    .send({ email: 'user@example.com', password: 'secret123' });

  const response = await request(app)
    .get('/admin/users')
    .set('Authorization', `Bearer ${signinResponse.body.token}`);

  assert.equal(response.status, 403);
});

test('DELETE /admin/users/:id blocks admin from deleting the signed-in admin account', async () => {
  const app = createApp({
    db: createFakeDb(),
    bcryptLib: fakeBcrypt,
    jwtSecret: 'test-secret'
  });

  const signinResponse = await request(app)
    .post('/signin')
    .send({ email: 'admin@example.com', password: 'secret123' });

  const response = await request(app)
    .delete('/admin/users/1')
    .set('Authorization', `Bearer ${signinResponse.body.token}`);

  assert.equal(response.status, 400);
});
