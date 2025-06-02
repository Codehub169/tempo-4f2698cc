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
   let model = req.query.model
   if (!prompt) return res.status(400).send("Missing prompt");

   res.setHeader("Content-Type", "text/event-stream");
   res.setHeader("Cache-Control", "no-cache");
   res.setHeader("Connection", "keep-alive");
   res.flushHeaders();

   try {
      const response = await ai.models.generateContentStream({
         model: model,
         contents: `
         Respond with code only. If the design requires multiple files, wrap each one like this:

         [FILE: index.html]
         <html>...</html>

         [FILE: style.css]
         body { ... }

         NEVER explain anything. Just output clean, modern, production-quality HTML, CSS, and JS.

         User request:
         ${prompt}
         `,
         config: {
            systemInstruction: `
         You are a coding assistant that helps to build an amazing prototype that is purely for design, not functionality. 
         You must respond ONLY with code — no explanations, no preambles.

         Use HTML, CSS, and JavaScript only. Ensure your output is clean, modern, and production-quality — it should awe top-tier developers.

         Ensure CSS, JS is always inside HTLM files only, do not create extra files

         If the design requires multiple pages (e.g., for navigation), output each file in the following format:

         [FILE: filename.html]
         <entire contents of that file>

         Repeat for all files (e.g., index.html, about.html, etc). Do not include explanations or anything outside this format.

         The main file should be named index.html. Include all necessary files this way so the frontend can preview index.html and allow ZIP download of all files.

         You are not allowed to talk or introduce the output — just stream the raw code.
            `
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