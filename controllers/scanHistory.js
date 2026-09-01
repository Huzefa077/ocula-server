function mapHistoryRow(row) {
  return {
    id: row.id,
    imageUrl: row.image_url || '',
    sourceType: row.source_type || 'url',
    faceCount: row.face_count || 0,
    processingTimeMs: row.processing_time_ms || 0,
    faceSummaries: Array.isArray(row.face_summaries) ? row.face_summaries : [],
    createdAt: row.created_at
  };
}

function sanitizeFaceSummaries(faceSummaries) {
  if (!Array.isArray(faceSummaries)) return [];

  return faceSummaries.slice(0, 20).map((face, index) => ({
    id: Number.isFinite(Number(face.id)) ? Number(face.id) : index + 1,
    age: Number.isFinite(Number(face.age)) ? Number(face.age) : null,
    gender: typeof face.gender === 'string' ? face.gender.slice(0, 32) : 'unknown',
    genderConfidence: Number.isFinite(Number(face.genderConfidence)) ? Number(face.genderConfidence) : 0,
    expression: typeof face.expression === 'string' ? face.expression.slice(0, 32) : 'unknown',
    expressionConfidence: Number.isFinite(Number(face.expressionConfidence)) ? Number(face.expressionConfidence) : 0
  }));
}

function getSignedInUserId(req) {
  return Number(req.auth.userId);
}

const handleListScanHistory = (db) => async (req, res) => {
  try {
    const rows = await db('user_scan_history')
      .select('id', 'image_url', 'source_type', 'face_count', 'processing_time_ms', 'face_summaries', 'created_at')
      .where({ user_id: getSignedInUserId(req) })
      .orderBy('created_at', 'desc')
      .limit(10);

    return res.json(rows.map(mapHistoryRow));
  } catch (error) {
    console.error('Scan history list error:', error);
    return res.status(400).json('Unable to load scan history');
  }
};

const handleCreateScanHistory = (db) => async (req, res) => {
  const signedInUserId = getSignedInUserId(req);
  const sourceType = req.body.sourceType === 'upload' ? 'upload' : 'url';
  const imageUrl = sourceType === 'url' && /^https?:\/\//i.test(req.body.imageUrl || '')
    ? req.body.imageUrl.slice(0, 2048)
    : null;
  const faceSummaries = sanitizeFaceSummaries(req.body.faceSummaries);
  const faceCount = Number.isFinite(Number(req.body.faceCount))
    ? Math.max(0, Number(req.body.faceCount))
    : faceSummaries.length;
  const processingTimeMs = Number.isFinite(Number(req.body.processingTimeMs))
    ? Math.max(0, Number(req.body.processingTimeMs))
    : 0;

  if (faceCount < 1) {
    return res.status(400).json('Scan history requires at least one detected face');
  }

  try {
    const createdRows = await db('user_scan_history')
      .insert({
        user_id: signedInUserId,
        image_url: imageUrl,
        source_type: sourceType,
        face_count: faceCount,
        processing_time_ms: processingTimeMs,
        face_summaries: JSON.stringify(faceSummaries)
      })
      .returning(['id', 'image_url', 'source_type', 'face_count', 'processing_time_ms', 'face_summaries', 'created_at']);

    await db('user_scan_history')
      .where({ user_id: signedInUserId })
      .whereNotIn('id', db('user_scan_history')
        .select('id')
        .where({ user_id: signedInUserId })
        .orderBy('created_at', 'desc')
        .limit(10))
      .del();

    return res.status(201).json(mapHistoryRow(createdRows[0]));
  } catch (error) {
    console.error('Scan history create error:', error);
    return res.status(400).json('Unable to save scan history');
  }
};

const handleDeleteScanHistoryItem = (db) => async (req, res) => {
  try {
    await db('user_scan_history')
      .where({
        id: req.params.id,
        user_id: getSignedInUserId(req)
      })
      .del();

    return res.status(204).send();
  } catch (error) {
    console.error('Scan history delete error:', error);
    return res.status(400).json('Unable to delete scan history item');
  }
};

const handleClearScanHistory = (db) => async (req, res) => {
  try {
    await db('user_scan_history')
      .where({ user_id: getSignedInUserId(req) })
      .del();

    return res.status(204).send();
  } catch (error) {
    console.error('Scan history clear error:', error);
    return res.status(400).json('Unable to clear scan history');
  }
};

module.exports = {
  handleClearScanHistory,
  handleCreateScanHistory,
  handleDeleteScanHistoryItem,
  handleListScanHistory
};
