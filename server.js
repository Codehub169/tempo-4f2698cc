const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize GoogleGenAI
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

app.get("/generate", async (req, res) => {
   let prompt = req.query.prompt;
   if (!prompt) return res.status(400).send("Missing prompt");

   res.setHeader("Content-Type", "text/event-stream");
   res.setHeader("Cache-Control", "no-cache");
   res.setHeader("Connection", "keep-alive");
   res.flushHeaders();

   try {
      const response = await ai.models.generateContentStream({
         model: "gemini-2.5-pro-preview-05-06",
         contents: prompt,
         config: {
            systemInstruction: "You are codeing assistant that helps to build an amazing prototype that is just a design and doesn't function at all, You need to use a single HTML page to show your design, you cannot talk or say any preamble or intro you just need to give the code which will showcase your design, make sure it is production level and will awe the coders at google itself",
         },
      });

      for await (const chunk of response) {
         const text = chunk.text;
         if (text) {
            // Escape newlines and other special characters if necessary
            const sanitizedText = text.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
            res.write(`data: ${sanitizedText}\n\n`);
         }
      }


      res.write("data: [DONE]\n\n");
      res.end();
   } catch (err) {
      console.error("Error generating content:", err);
      res.write(`data: Error: ${err.message}\n\n`);
      res.end();
   }
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));