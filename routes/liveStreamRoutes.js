const express = require('express');
const router = express.Router();
const cors = require("cors");
const dotenv = require("dotenv");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

dotenv.config();
const app = express();
app.use(cors());

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERT;

router.get("/agora/token", (req, res) => {
  const { channel, uid, role } = req.query;

  if (!channel) return res.status(400).json({ error: "Channel is required" });

  const userRole = role === "host" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channel,
    uid || 0, // Auto-assign UID if not provided
    userRole,
    Math.floor(Date.now() / 1000) + 3600
  );

  res.json({ token, uid: uid || Math.floor(Math.random() * 10000) });
});

module.exports = router; 