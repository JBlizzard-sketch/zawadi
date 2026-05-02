import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db/schema";

const router = Router();

router.get("/categories", async (req, res) => {
  try {
    const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
    res.json(categories);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

export default router;
