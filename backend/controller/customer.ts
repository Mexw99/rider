import express from "express";
import { pool } from "../database/pool";

export const customerRouter = express.Router();

customerRouter.get("/", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        customer_id,
        first_name,
        last_name,
        phone,
        address,
        latitude,
        longitude,
        created_at,
        updated_at
      FROM customers
      ORDER BY customer_id
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("ไม่สามารถแสดงข้อมูลลูกค้าได้:", error);
    res.status(500).json({
      message: "ไม่สามารถแสดงข้อมูลลูกค้าได้",
    });
  }
});

customerRouter.post("/", async (req, res) => {
  const { first_name, last_name, phone, address, latitude, longitude } =
    req.body;

  const lat = Number(latitude);
  const lon = Number(longitude);

  if (
    typeof first_name !== "string" ||
    first_name.trim() === "" ||
    typeof last_name !== "string" ||
    last_name.trim() === "" ||
    typeof phone !== "string" ||
    phone.trim() === "" ||
    typeof address !== "string" ||
    address.trim() === "" ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    !Number.isFinite(lon) ||
    lon < -180 ||
    lon > 180
  ) {
    res.status(400).json({
      message:
        "กรุณาส่ง first_name, last_name, phone, address, latitude และ longitude ให้ถูกต้อง",
    });
    return;
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO customers
        (first_name, last_name, phone, address, latitude, longitude)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING
        customer_id,
        first_name,
        last_name,
        phone,
        address,
        latitude,
        longitude,
        created_at,
        updated_at
      `,
      [
        first_name.trim(),
        last_name.trim(),
        phone.trim(),
        address.trim(),
        lat,
        lon,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("ไม่สามารถเพิ่มข้อมูลลูกค้าได้:", error);
    res.status(500).json({
      message: "ไม่สามารถเพิ่มข้อมูลลูกค้าได้",
    });
  }
});

customerRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({
      message: "customer id ต้องเป็นจำนวนเต็มบวก",
    });
    return;
  }

  try {
    const result = await pool.query(
      `
      DELETE FROM customers
      WHERE customer_id = $1
      RETURNING customer_id
      `,
      [id],
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        message: "ไม่พบข้อมูลลูกค้า",
      });
      return;
    }

    res.status(200).json({
      message: "ลบข้อมูลลูกค้าสำเร็จ",
      customer_id: result.rows[0].customer_id,
    });
  } catch (error: unknown) {
    console.error("ไม่สามารถลบข้อมูลลูกค้าได้:", error);

    const databaseError = error as { code?: string };

    if (databaseError.code === "23503") {
      res.status(409).json({
        message: "ไม่สามารถลบลูกค้าที่มีรายการสั่งซื้ออยู่ได้",
      });
      return;
    }

    res.status(500).json({
      message: "ไม่สามารถลบข้อมูลลูกค้าได้",
    });
  }
});

customerRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({
      message: "customer id ต้องเป็นจำนวนเต็มบวก",
    });
    return;
  }

  const body = req.body ?? {};

  const editableFields = [
    "first_name",
    "last_name",
    "phone",
    "address",
    "latitude",
    "longitude",
  ] as const;

  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const field of editableFields) {
    if (body[field] === undefined) {
      continue;
    }

    if (["first_name", "last_name", "phone", "address"].includes(field)) {
      if (typeof body[field] !== "string" || body[field].trim() === "") {
        res.status(400).json({
          message: `${field} ต้องเป็นข้อความและห้ามว่าง`,
        });
        return;
      }

      setClauses.push(`${field} = $${values.length + 1}`);
      values.push(body[field].trim());
      continue;
    }

    const coordinate = Number(body[field]);

    if (
      !Number.isFinite(coordinate) ||
      (field === "latitude" && (coordinate < -90 || coordinate > 90)) ||
      (field === "longitude" && (coordinate < -180 || coordinate > 180))
    ) {
      res.status(400).json({
        message: `${field} ไม่ถูกต้อง`,
      });
      return;
    }

    setClauses.push(`${field} = $${values.length + 1}`);
    values.push(coordinate);
  }

  if (setClauses.length === 0) {
    res.status(400).json({
      message: "ต้องส่งข้อมูลอย่างน้อยหนึ่งฟิลด์เพื่อแก้ไข",
    });
    return;
  }

  try {
    values.push(id);

    const result = await pool.query(
      `
      UPDATE customers
      SET ${setClauses.join(", ")}
      WHERE customer_id = $${values.length}
      RETURNING
        customer_id,
        first_name,
        last_name,
        phone,
        address,
        latitude,
        longitude,
        created_at,
        updated_at
      `,
      values,
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        message: "ไม่พบข้อมูลลูกค้า",
      });
      return;
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("ไม่สามารถแก้ไขข้อมูลลูกค้าได้:", error);

    res.status(500).json({
      message: "ไม่สามารถแก้ไขข้อมูลลูกค้าได้",
    });
  }
});
