const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// ─── GET /api/stats ───────────────────────────────────────────────────────────
// Returns dashboard statistics
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)                                                         AS total_files,
        COUNT(*) FILTER (WHERE type = 'incoming')                        AS incoming_count,
        COUNT(*) FILTER (WHERE type = 'outgoing')                        AS outgoing_count,
        COUNT(*) FILTER (WHERE status = 'Pending')                       AS pending_count,
        COUNT(*) FILTER (WHERE status = 'In Progress')                   AS in_progress_count,
        COUNT(*) FILTER (WHERE status = 'Completed')                     AS completed_count,
        COUNT(*) FILTER (WHERE status = 'Returned')                      AS returned_count,
        COUNT(*) FILTER (WHERE date_logged = CURRENT_DATE)               AS today_count
      FROM files
    `);

    const row = result.rows[0];

    return res.json({
      total_files:      parseInt(row.total_files, 10),
      incoming_count:   parseInt(row.incoming_count, 10),
      outgoing_count:   parseInt(row.outgoing_count, 10),
      pending_count:    parseInt(row.pending_count, 10),
      in_progress_count:parseInt(row.in_progress_count, 10),
      completed_count:  parseInt(row.completed_count, 10),
      returned_count:   parseInt(row.returned_count, 10),
      today_count:      parseInt(row.today_count, 10),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
