import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Fallback Database
let fallbackTodos = [
  {
    id: "demo-1",
    text: "Review the beautiful Todo App on AI Studio",
    completed: true,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    category: "Work",
    priority: "high" as const,
    notes: "Explore all filters, search features, and animation micro-interactions!"
  },
  {
    id: "demo-2",
    text: "Add a new urgent task with due date",
    completed: false,
    createdAt: new Date().toISOString(),
    category: "Personal",
    priority: "medium" as const,
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    notes: "Try selecting different priorities!"
  },
  {
    id: "demo-3",
    text: "Connect my MongoDB Atlas Connection String",
    completed: false,
    createdAt: new Date().toISOString(),
    category: "Technical",
    priority: "high" as const,
    notes: "Get your connection string from cloud.mongodb.com and add it to secrets."
  }
];

// Lazy-loaded MongoDB variables
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let lastError: string | null = null;

async function getMongoDB(): Promise<{ db: Db | null; usingFallback: boolean; error: string | null }> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return {
      db: null,
      usingFallback: true,
      error: "MONGODB_URI is not set. Add it in AI Studio Secrets to enable MongoDB Atlas persistence."
    };
  }

  try {
    if (!mongoClient) {
      console.log("Connecting lazy Client to MongoDB Atlas...");
      mongoClient = new MongoClient(uri, {
        connectTimeoutMS: 5000,
        socketTimeoutMS: 5000,
      });
      await mongoClient.connect();
      mongoDb = mongoClient.db();
      console.log("Connected successfully to MongoDB Atlas database:", mongoDb.databaseName);
      lastError = null;
    }
    return { db: mongoDb, usingFallback: false, error: null };
  } catch (err: any) {
    console.error("MongoDB Atlas connection failed:", err);
    // On failure, reset client so we can retry on subsequent hits
    mongoClient = null;
    mongoDb = null;
    const rawError = err?.message || String(err);
    if (rawError.includes("tlsv1 alert internal error") || rawError.includes("alert number 80")) {
      lastError = "IP Whitelisting Error (SSL Alert 80). IMPORTANT: MongoDB Atlas rejected our handshake because this dynamic Cloud Run container's IP is not whitelisted. Please go to your MongoDB Atlas Console -> 'Network Access' tab, click 'Add IP Address', and choose 'Allow Access From Anywhere' (0.0.0.0/0).";
    } else {
      lastError = rawError;
    }
    return { db: null, usingFallback: true, error: `Connection failed: ${lastError}` };
  }
}

// API: Get DB connection status
app.get("/api/status", async (req, res) => {
  const { db, usingFallback, error } = await getMongoDB();
  res.json({
    connected: !usingFallback && !!db,
    usingFallback,
    databaseName: db ? db.databaseName : null,
    errorMessage: error
  });
});

// API: Get all todos
app.get("/api/todos", async (req, res) => {
  const { db, usingFallback } = await getMongoDB();
  if (!usingFallback && db) {
    try {
      const todos = await db.collection("todos").find({}).sort({ createdAt: -1 }).toArray();
      res.json(todos);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch todos from Atlas: " + err.message });
    }
  } else {
    // In-memory fallback
    res.json(fallbackTodos);
  }
});

// API: Create a todo
app.post("/api/todos", async (req, res) => {
  const { text, completed, category, priority, dueDate, notes, id } = req.body;
  if (!text) {
    res.status(400).json({ error: "Text field is required" });
    return;
  }

  const newTodo = {
    id: id || Date.now().toString(),
    text,
    completed: !!completed,
    createdAt: new Date().toISOString(),
    category: category || "General",
    priority: priority || "medium",
    dueDate: dueDate || "",
    notes: notes || ""
  };

  const { db, usingFallback } = await getMongoDB();
  if (!usingFallback && db) {
    try {
      await db.collection("todos").insertOne(newTodo);
      res.status(201).json(newTodo);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to persist to MongoDB: " + err.message });
    }
  } else {
    // In-memory fallback
    fallbackTodos.unshift(newTodo);
    res.status(201).json(newTodo);
  }
});

// API: Update a todo
app.put("/api/todos/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Protect ID and createdAt
  delete updates._id;
  delete updates.id;
  delete updates.createdAt;

  const { db, usingFallback } = await getMongoDB();
  if (!usingFallback && db) {
    try {
      const result = await db.collection("todos").findOneAndUpdate(
        { id: id },
        { $set: updates },
        { returnDocument: "after" }
      );
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: "Todo not found in Atlas" });
      }
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update in MongoDB: " + err.message });
    }
  } else {
    // In-memory fallback
    const index = fallbackTodos.findIndex(t => t.id === id);
    if (index !== -1) {
      fallbackTodos[index] = { ...fallbackTodos[index], ...updates };
      res.json(fallbackTodos[index]);
    } else {
      res.status(404).json({ error: "Todo not found" });
    }
  }
});

// API: Delete a todo
app.delete("/api/todos/:id", async (req, res) => {
  const { id } = req.params;

  const { db, usingFallback } = await getMongoDB();
  if (!usingFallback && db) {
    try {
      const result = await db.collection("todos").deleteOne({ id: id });
      if (result.deletedCount > 0) {
        res.json({ success: true, message: "Deleted from Atlas" });
      } else {
        res.status(404).json({ error: "Todo not found in Atlas" });
      }
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete from MongoDB: " + err.message });
    }
  } else {
    // In-memory fallback
    const index = fallbackTodos.findIndex(t => t.id === id);
    if (index !== -1) {
      fallbackTodos.splice(index, 1);
      res.json({ success: true, message: "Deleted from memory" });
    } else {
      res.status(404).json({ error: "Todo not found" });
    }
  }
});

// Serve frontend assets in production or use Vite dev server in development
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Todo Backend] Server started on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
});
