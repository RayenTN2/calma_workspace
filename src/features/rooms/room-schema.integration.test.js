/** @jest-environment node */

const { randomUUID } = require("node:crypto");
const { Pool } = require("pg");

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
const describeWithTestDatabase = testDatabaseUrl ? describe : describe.skip;

describeWithTestDatabase("PostgreSQL room schema", () => {
  let pool;
  let client;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testDatabaseUrl });
    client = await pool.connect();
  });

  beforeEach(async () => {
    await client.query("BEGIN");
  });

  afterEach(async () => {
    await client.query("ROLLBACK");
  });

  afterAll(async () => {
    client?.release();
    await pool?.end();
  });

  test("has the rooms, equipment, join table, and room types", async () => {
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('rooms', 'equipment', 'room_equipment')
    `);
    expect(tables.rows.map((row) => row.table_name).sort()).toEqual([
      "equipment",
      "room_equipment",
      "rooms",
    ]);

    const types = await client.query(`
      SELECT enumlabel
      FROM pg_enum
      JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
      WHERE pg_type.typname = 'room_type'
      ORDER BY enumsortorder
    `);
    expect(types.rows.map((row) => row.enumlabel)).toEqual([
      "INDIVIDUAL",
      "MEETING",
      "TRAINING",
      "OTHER",
    ]);

    const roomColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'rooms'
    `);
    expect(roomColumns.rows.map((row) => row.column_name)).toContain("custom_room_type");
  });

  test.each([0, -1])("rejects capacity %s in PostgreSQL", async (capacity) => {
    const savepoint = `before_capacity_${Math.abs(capacity)}`;
    await client.query(`SAVEPOINT ${savepoint}`);

    await expect(client.query(
      "INSERT INTO rooms (name, capacity, room_type) VALUES ($1, $2, 'MEETING')",
      [`jest-invalid-${randomUUID()}`, capacity]
    )).rejects.toMatchObject({ code: "23514" });

    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
  });

  test("stores a valid room, its equipment relation, and inactive status", async () => {
    const roomResult = await client.query(
      "INSERT INTO rooms (name, capacity, room_type) VALUES ($1, 6, 'MEETING') RETURNING id, is_active",
      [`jest-valid-${randomUUID()}`]
    );
    const room = roomResult.rows[0];
    expect(room.is_active).toBe(true);

    const equipmentResult = await client.query(
      "INSERT INTO equipment (name) VALUES ($1) RETURNING id",
      [`jest-equipment-${randomUUID()}`]
    );
    const equipmentId = equipmentResult.rows[0].id;

    await client.query(
      "INSERT INTO room_equipment (room_id, equipment_id) VALUES ($1, $2)",
      [room.id, equipmentId]
    );
    const relation = await client.query(
      "SELECT room_id, equipment_id FROM room_equipment WHERE room_id = $1 AND equipment_id = $2",
      [room.id, equipmentId]
    );
    expect(relation.rowCount).toBe(1);

    const deactivated = await client.query(
      "UPDATE rooms SET is_active = false WHERE id = $1 RETURNING is_active",
      [room.id]
    );
    expect(deactivated.rows[0].is_active).toBe(false);
  });
});
