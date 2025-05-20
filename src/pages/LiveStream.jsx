import { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import axios from "axios";
import { 
  Mic, MicOff, Video, VideoOff, 
  Monitor, Users, Eye, Clock, 
  Send, PhoneOff, LogOut
} from "lucide-react";
import { useParams } from 'react-router-dom';
import { serverbaseURL } from '../constant/index';

const APP_ID = "da81c93dcec64dd0951e8928b26d5a60";
const CHANNEL_NAME = "test-channel"; // Dynamic channels can be used

const LiveStream = () => {
  const { id: communityId, streamId } = useParams();
  const client = useRef(null);
  const localTrack = useRef(null);
  const [joined, setJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [uid, setUid] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenTrack = useRef(null);
  const [channelName, setChannelName] = useState(CHANNEL_NAME);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamStartTime, setStreamStartTime] = useState(null);
  const [streamDuration, setStreamDuration] = useState("00:00:00");
  const durationInterval = useRef(null);
  const [streamData, setStreamData] = useState(null);

  useEffect(() => {
    client.current = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
    
    // Set up event handlers
    setupClientEvents();

    // Fetch the livestream data
    const fetchStreamData = async () => {
      try {
        try {
          const response = await axios.get(`${serverbaseURL}api/communities/${communityId}/livestreams/${streamId}`);
          setStreamData(response.data);
          setChannelName(response.data.channelName);
        } catch (error) {
          console.log("Livestream API not available yet:", error);
          // Use default channel name if API isn't available
          setStreamData({
            title: "Live Stream",
            description: "API not available yet"
          });
        }
      } catch (error) {
        console.error("Error fetching stream data:", error);
      }
    };
    
    fetchStreamData();

    return () => { 
      if (joined) leaveChannel();
      if (durationInterval.current) clearInterval(durationInterval.current);
    };
  }, [communityId, streamId]);

  const setupClientEvents = () => {
    if (!client.current) return;

    client.current.on("user-published", async (user, mediaType) => {
      await client.current.subscribe(user, mediaType);
      
      // Update users list
      setUsers(prev => {
        if (!prev.find(u => u.uid === user.uid)) {
          return [...prev, user];
        }
        return prev;
      });
      
      if (mediaType === "video") {
        const playerContainer = document.createElement("div");
        playerContainer.id = `player-wrapper-${user.uid}`;
        playerContainer.className = "relative rounded-lg overflow-hidden bg-gray-800 shadow-lg";
        
        const player = document.createElement("div");
        player.id = `user-${user.uid}`;
        player.className = "w-full h-full";
        playerContainer.appendChild(player);
        
        const nameTag = document.createElement("div");
        nameTag.className = "absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-sm";
        nameTag.textContent = `User ${user.uid}`;
        playerContainer.appendChild(nameTag);
        
        document.getElementById("remote-streams").appendChild(playerContainer);
        user.videoTrack.play(player.id);
      }
      
      if (mediaType === "audio") {
        user.audioTrack.play();
      }
    });

    client.current.on("user-unpublished", (user, mediaType) => {
      if (mediaType === "video") {
        const playerElement = document.getElementById(`player-wrapper-${user.uid}`);
        if (playerElement) {
          playerElement.remove();
        }
      }
      
      // Update users list
      setUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    client.current.on("user-joined", (user) => {
      setViewerCount(prev => prev + 1);
      console.log("User joined:", user.uid);
    });

    client.current.on("user-left", (user) => {
      setViewerCount(prev => Math.max(0, prev - 1));
      console.log("User left:", user.uid);
      
      const playerElement = document.getElementById(`player-wrapper-${user.uid}`);
      if (playerElement) {
        playerElement.remove();
      }
      
      // Update users list
      setUsers(prev => prev.filter(u => u.uid !== user.uid));
    });
  };

  const getToken = async (role) => {
    try {
      const res = await axios.get(`/agora/token?channel=${channelName}&role=${role}`);
      setUid(res.data.uid);
      return res.data.token;
    } catch (error) {
      console.error("Error getting token:", error);
      throw error;
    }
  };

  const joinChannel = async (role) => {
    try {
      setIsHost(role === "host");
      const token = await getToken(role);

      await client.current.join(APP_ID, channelName, token, uid);
      client.current.setClientRole(role);

      if (role === "host") {
        localTrack.current = await AgoraRTC.createMicrophoneAndCameraTracks();
        const [audioTrack, videoTrack] = localTrack.current;

        const playerContainer = document.createElement("div");
        playerContainer.id = "local-player-wrapper";
        playerContainer.className = "relative rounded-lg overflow-hidden bg-gray-800 shadow-lg w-full h-[480px]";
        
        const player = document.createElement("div");
        player.id = "local-player";
        player.className = "w-full h-full";
        playerContainer.appendChild(player);
        
        const nameTag = document.createElement("div");
        nameTag.className = "absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-sm";
        nameTag.textContent = "You (Host)";
        playerContainer.appendChild(nameTag);
        
        document.getElementById("local-stream").appendChild(playerContainer);
        videoTrack.play("local-player");
        
        await client.current.publish([audioTrack, videoTrack]);
        setStreamStartTime(new Date());
        
        // Start duration timer
        durationInterval.current = setInterval(() => {
          updateStreamDuration();
        }, 1000);
      }
      
      setJoined(true);
      setViewerCount(1); // Start with 1 (yourself)
    } catch (error) {
      console.error("Error joining channel:", error);
    }
  };

  const updateStreamDuration = () => {
    if (!streamStartTime) return;
    
    const diff = new Date() - streamStartTime;
    const hours = Math.floor(diff / 3600000).toString().padStart(2, "0");
    const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
    const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
    
    setStreamDuration(`${hours}:${minutes}:${seconds}`);
  };

  const leaveChannel = async () => {
    try {
      if (isScreenSharing) {
        await stopScreenShare();
      }
      
      if (isHost && localTrack.current) {
        localTrack.current.forEach(track => track.close());
      }
      
      await client.current.leave();
      
      document.getElementById("local-stream").innerHTML = "";
      document.getElementById("remote-streams").innerHTML = "";
      
      setJoined(false);
      setUsers([]);
      setMessages([]);
      setViewerCount(0);
      setStreamStartTime(null);
      
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    } catch (error) {
      console.error("Error leaving channel:", error);
    }
  };

  const toggleMute = async () => {
    if (!isHost || !localTrack.current) return;
    
    const audioTrack = localTrack.current[0];
    if (isMuted) {
      await audioTrack.setEnabled(true);
      setIsMuted(false);
    } else {
      await audioTrack.setEnabled(false);
      setIsMuted(true);
    }
  };

  const toggleCamera = async () => {
    if (!isHost || !localTrack.current) return;
    
    const videoTrack = localTrack.current[1];
    if (isCameraOff) {
      await videoTrack.setEnabled(true);
      setIsCameraOff(false);
    } else {
      await videoTrack.setEnabled(false);
      setIsCameraOff(true);
    }
  };

  const startScreenShare = async () => {
    if (!isHost) return;
    
    try {
      screenTrack.current = await AgoraRTC.createScreenVideoTrack();
      
      if (localTrack.current) {
        // Unpublish camera video track
        await client.current.unpublish([localTrack.current[1]]);
      }
      
      // Publish screen track
      await client.current.publish(screenTrack.current);
      
      // Replace local video with screen share
      const localPlayer = document.getElementById("local-player");
      if (localPlayer) {
        screenTrack.current.play("local-player");
      }
      
      setIsScreenSharing(true);
      
      // Handle when user stops screen sharing from browser UI
      screenTrack.current.on("track-ended", () => {
        stopScreenShare();
      });
    } catch (error) {
      console.error("Error starting screen share:", error);
    }
  };

  const stopScreenShare = async () => {
    if (!isScreenSharing || !screenTrack.current) return;
    
    try {
      // Unpublish screen track
      await client.current.unpublish(screenTrack.current);
      screenTrack.current.close();
      
      // Republish camera video track
      if (localTrack.current) {
        await client.current.publish([localTrack.current[1]]);
        
        // Play local video again
        const localPlayer = document.getElementById("local-player");
        if (localPlayer) {
          localTrack.current[1].play("local-player");
        }
      }
      
      setIsScreenSharing(false);
    } catch (error) {
      console.error("Error stopping screen share:", error);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message = {
      text: newMessage,
      sender: isHost ? "Host" : `User ${uid}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage("");
    
    // In a real app, you would use Agora RTM SDK to send messages to other users
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gray-800 text-white">
        <div>
          <h2 className="text-xl font-bold">{streamData?.title || "Agora Live Stream"}</h2>
          {streamData && <p className="text-sm text-gray-300">{streamData.description}</p>}
        </div>
        <div className="flex gap-4 items-center">
          <div className="text-sm">Channel: {channelName}</div>
          {joined && (
            <>
              <div className="flex items-center gap-1 text-sm">
                <Eye size={16} /> {viewerCount} viewers
              </div>
              {isHost && streamStartTime && (
                <div className="flex items-center gap-1 text-sm">
                  <Clock size={16} /> {streamDuration}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video container */}
        <div className="flex-grow bg-gray-900 p-4 overflow-auto">
          <div id="local-stream" className="mb-4"></div>
          <div id="remote-streams" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          {/* Participants */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-700 flex items-center gap-2 mb-2">
              <Users size={16} /> Participants ({users.length + 1})
            </h3>
            <ul className="max-h-40 overflow-y-auto">
              <li className="py-2 border-b border-gray-100 flex items-center">
                <span className="bg-gray-200 text-xs px-1.5 py-0.5 rounded mr-2">
                  {isHost ? "Host" : "You"}
                </span>
                <span>You</span>
              </li>
              {users.map(user => (
                <li key={user.uid} className="py-2 border-b border-gray-100 flex items-center">
                  <span className="bg-gray-200 text-xs px-1.5 py-0.5 rounded mr-2">Viewer</span>
                  <span>User {user.uid}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col p-4">
            <h3 className="font-medium text-gray-700 mb-2">Live Chat</h3>
            <div className="flex-1 overflow-y-auto mb-4 space-y-2">
              {messages.map((msg, index) => (
                <div key={index} className="bg-gray-100 rounded-lg p-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{msg.sender}</span>
                    <span className="text-xs text-gray-500">{msg.timestamp}</span>
                  </div>
                  <p className="mt-1 text-sm">{msg.text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <button 
                onClick={sendMessage}
                className="bg-blue-500 text-white rounded p-2"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-800 flex justify-center">
        {!joined ? (
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Enter channel name"
              className="px-3 py-2 rounded border border-gray-300"
            />
            <button 
              onClick={() => joinChannel("host")}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
            >
              <Video size={18} /> Start Stream (Host)
            </button>
            <button 
              onClick={() => joinChannel("audience")}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              <Eye size={18} /> Join as Audience
            </button>
          </div>
        ) : (
          <div className="flex gap-4">
            {isHost && (
              <>
                <button 
                  onClick={toggleMute}
                  className={`flex items-center gap-2 px-4 py-2 rounded transition ${
                    isMuted ? 'bg-red-600 text-white' : 'bg-gray-600 text-white'
                  }`}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  {isMuted ? "Unmute" : "Mute"}
                </button>
                <button 
                  onClick={toggleCamera}
                  className={`flex items-center gap-2 px-4 py-2 rounded transition ${
                    isCameraOff ? 'bg-red-600 text-white' : 'bg-gray-600 text-white'
                  }`}
                >
                  {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
                  {isCameraOff ? "Camera On" : "Camera Off"}
                </button>
                <button 
                  onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                  className={`flex items-center gap-2 px-4 py-2 rounded transition ${
                    isScreenSharing ? 'bg-orange-600 text-white' : 'bg-gray-600 text-white'
                  }`}
                >
                  <Monitor size={18} />
                  {isScreenSharing ? "Stop Sharing" : "Share Screen"}
                </button>
              </>
            )}
            <button 
              onClick={leaveChannel}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
            >
              <PhoneOff size={18} /> Leave Stream
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveStream;
