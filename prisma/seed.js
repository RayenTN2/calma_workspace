const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Rayen123@localhost:5434/calma',
});

async function seed() {
  await client.connect();
  console.log('Seeding rooms and equipment...');

  // 1. Insert Equipment
  const wifiRes = await client.query(
    "INSERT INTO equipment (name) VALUES ('Wifi') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id"
  );
  const projRes = await client.query(
    "INSERT INTO equipment (name) VALUES ('Projecteur') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id"
  );
  const boardRes = await client.query(
    "INSERT INTO equipment (name) VALUES ('Tableau') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id"
  );

  const wifiId = wifiRes.rows[0].id;
  const projId = projRes.rows[0].id;
  const boardId = boardRes.rows[0].id;

  // 2. Insert Rooms
  const r1 = await client.query(`
    INSERT INTO rooms (name, capacity, room_type, is_active)
    VALUES ('Bureau Calme A', 2, 'INDIVIDUAL', true)
    ON CONFLICT (name) DO UPDATE SET is_active = true
    RETURNING id
  `);

  const r2 = await client.query(`
    INSERT INTO rooms (name, capacity, room_type, is_active)
    VALUES ('Salle de Réunion Atlas', 8, 'MEETING', true)
    ON CONFLICT (name) DO UPDATE SET is_active = true
    RETURNING id
  `);

  const r3 = await client.query(`
    INSERT INTO rooms (name, capacity, room_type, is_active)
    VALUES ('Salle de Formation Oasis', 20, 'TRAINING', true)
    ON CONFLICT (name) DO UPDATE SET is_active = true
    RETURNING id
  `);

  // 3. Link Room Equipment
  const links = [
    [r1.rows[0].id, wifiId],
    [r2.rows[0].id, wifiId],
    [r2.rows[0].id, projId],
    [r2.rows[0].id, boardId],
    [r3.rows[0].id, wifiId],
    [r3.rows[0].id, projId],
    [r3.rows[0].id, boardId],
  ];

  for (const [roomId, equipId] of links) {
    await client.query(`
      INSERT INTO room_equipment (room_id, equipment_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [roomId, equipId]);
  }

  console.log('Seed completed successfully!');
  await client.end();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  client.end();
  process.exit(1);
});
