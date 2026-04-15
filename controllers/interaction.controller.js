const User = require("../models/User");
const Comment = require("../models/Comment");
const Video = require("../models/Video");
const Conversation = require("../models/Conversation"); // Add this
const Message = require("../models/Message");
const { sendWelcomeEmail,sendNotificationEmail } = require("../services/email.service");

// Add comment
exports.addComment = async (req, res) => {
  try {
    const { videoId, text } = req.body;
    const video = await Video.findById(videoId).populate("userId", "email username");

    if (!video) return res.status(404).json({ msg: "Video not found" });

    const comment = await Comment.create({
      videoId,
      userId: req.user._id,
      text,
    });

    video.commentsCount += 1;
    await video.save();

 // Notify video owner if commenter is not the owner
if (video.userId.email !== req.user.email) {
  sendNotificationEmail(
    video.userId.email,
    req.user.username,  // user who commented
    "commented on",    // action type
    video.caption,     // video caption
    text               // <-- pass the comment text here
  ).catch(err => console.error(err));
}

res.json({ msg: "Comment added", comment });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const { videoId } = req.body;
    const video = await Video.findById(videoId).populate("userId", "email username");

    if (!video) return res.status(404).json({ msg: "Video not found" });

    video.likes = video.likes || [];
    const userIdStr = req.user._id.toString();
    const index = video.likes.indexOf(userIdStr);
    let liked = false;

    if (index === -1) {
      video.likes.push(req.user._id);
      liked = true;

      // SAFETY CHECK: Ensure both owner and current user emails exist before comparing
      if (video.userId?.email && req.user?.email) {
        if (video.userId.email !== req.user.email) {
          sendNotificationEmail(
            video.userId.email,
            req.user.username,
            "liked",
            video.caption || "your video"
          ).catch(err => console.error("Email Error:", err));
        }
      }
    } else {
      video.likes.splice(index, 1);
      liked = false;
    }

    video.likesCount = video.likes.length;
    await video.save();

    res.json({ msg: liked ? "Video liked" : "Video unliked", likesCount: video.likesCount });
  } catch (err) {
    console.error("TOGGLE_LIKE_ERROR:", err); // Look for this in your terminal!
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
// Repost a video
exports.repostVideo = async (req, res) => {
  try {
    const { videoId } = req.body;

    // $inc is "Atomic" - it prevents math errors if 100 kids repost at once
    const video = await Video.findByIdAndUpdate(
      videoId, 
      { $inc: { repostsCount: 1 } }, 
      { new: true }
    ).populate("userId", "email username");

    if (!video) return res.status(404).json({ msg: "Video not found" });

    // Email notification logic stays the same...
    if (video.userId.email !== req.user.email) {
       sendNotificationEmail(video.userId.email, req.user.username, "reposted", video.caption);
    }

    res.json({ msg: "Video reposted", repostsCount: video.repostsCount });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

// Get comments for a video
exports.getComments = async (req, res) => {
  try {
    const { videoId } = req.params;
    const comments = await Comment.find({ videoId })
      .populate("userId", "username avatarUrl")
      .sort({ createdAt: -1 });

    res.json({ comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

//Follow/ unfollow user 
exports.toggleFollow = async (req, res) => {
  try {
    const { userId } = req.body; // Person to follow
    const myId = req.user._id;   // Logged in user

    if (userId === myId.toString()) {
      return res.status(400).json({ msg: "You cannot follow yourself" });
    }

    // 1. Fetch target user to check current state
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ msg: "User not found" });

    const isFollowing = targetUser.followers.includes(myId);

    if (isFollowing) {
      // 2. Unfollow: Atomic Pull (Removes ID from array)
      await User.findByIdAndUpdate(userId, { $pull: { followers: myId } });
      await User.findByIdAndUpdate(myId, { $pull: { following: userId } });
    } else {
      // 3. Follow: Atomic AddToSet (Adds ID only if it doesn't exist)
      await User.findByIdAndUpdate(userId, { $addToSet: { followers: myId } });
      await User.findByIdAndUpdate(myId, { $addToSet: { following: userId } });

      // Notify via email (Optional Chaining used to prevent "Ghost User" crash)
      if (targetUser.email) {
        sendNotificationEmail(
          targetUser.email,
          req.user.username,
          "followed you",
          null
        ).catch(err => console.error("Email Error:", err));
      }
    }

    res.json({ 
      success: true, 
      msg: isFollowing ? "Unfollowed" : "Following", 
      isFollowing: !isFollowing 
    });

  } catch (err) {
    console.error("FOLLOW_ERROR:", err);
    res.status(500).json({ msg: "Server error during follow action" });
  }
};
// 1. Get Inbox (Conversations List)
exports.getConversations = async (req, res) => {
  try {
    const chats = await Conversation.find({
      participants: req.user._id 
    })
    .populate("participants", "username avatarUrl email")
    .sort({ updatedAt: -1 });

    // Format for Frontend: Identify the "Other User" automatically
    const formatted = chats.map(chat => {
      const otherUser = chat.participants.find(
        (p) => p._id.toString() !== req.user._id.toString()
      );
      return {
        _id: chat._id,
        lastMessage: chat.lastMessage,
        updatedAt: chat.updatedAt,
        otherUser
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ msg: "Inbox load failed" });
  }
};

// 2. Get Messages for a specific Scholar
exports.getMessages = async (req, res) => {
  try {
    const { otherUserId } = req.params;

    // Find the shared conversation room
    const conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, otherUserId] }
    });

    if (!conversation) return res.json([]);

    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 }); // Oldest to newest

    res.json(messages);
  } catch (err) {
    res.status(500).json({ msg: "Messages load failed" });
  }
};

// 3. Send Direct Message (Real-time Enabled)
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const senderId = req.user._id;

    // A. Find or Create Conversation Room
    let conv = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] }
    }).populate("participants", "username avatarUrl");

    if (!conv) {
      conv = await Conversation.create({ participants: [senderId, receiverId] });
      // Re-populate to get user details for the socket emit
      conv = await Conversation.findById(conv._id).populate("participants", "username avatarUrl");
    }

    // B. Create the Message
    const newMessage = await Message.create({
      conversationId: conv._id,
      sender: senderId,
      text
    });

    // C. Update Conversation Metadata (bumps it to top of inbox)
    conv.lastMessage = text;
    await conv.save();

    // --- REAL-TIME TRIGGER START ---
    const io = req.app.get("socketio");
    if (io) {
      // 1. Send bubble to receiver's chat window
      io.to(receiverId.toString()).emit("receive_message", newMessage);

      // 2. Update receiver's Inbox sidebar (ChatList.jsx)
      const otherUserForReceiver = conv.participants.find(p => p._id.toString() === senderId.toString());
      
      io.to(receiverId.toString()).emit("update_chat_list", {
        _id: conv._id,
        lastMessage: text,
        updatedAt: conv.updatedAt,
        otherUser: otherUserForReceiver
      });
      
      console.log(`📡 Socket: Message emitted to user ${receiverId}`);
    }
    // --- REAL-TIME TRIGGER END ---

    // D. Notify Receiver (Email) - Only if they have an email
    const receiver = await User.findById(receiverId);
    
    // We only send the email if the receiver exists and has an email
    if (receiver && receiver.email) {
      // Logic: You can add 'if (receiver.isOffline)' here if you have that field
      // to avoid spamming them while they are actively chatting.
      
      sendNotificationEmail(
        receiver.email,
        req.user.username, // Sender's Name
        text               // The Message Content
      ).catch(err => console.error("Chat Email Error:", err.message));
    }

    res.json(newMessage);
  } catch (err) {
    console.error("SEND_MESSAGE_ERROR:", err);
    res.status(500).json({ msg: "Failed to send message" });
  }
};
exports.searchScholars = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.json([]);

    const scholars = await User.find({
      username: { $regex: username, $options: "i" },
      _id: { $ne: req.user._id } // Exclude the logged-in user
    }).select("username avatarUrl email");

    res.json(scholars);
  } catch (err) {
    res.status(500).json({ msg: "Search error" });
  }
};// Get everyone who is currently live
exports.getLiveUsers = async (req, res) => {
  try {
    const liveUsers = await User.find({ isLive: true })
      .select("username avatarUrl liveStreamTitle");
    res.json(liveUsers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch" });
  }
};

// Set status (Start or Stop)
exports.setLiveStatus = async (req, res) => {
  try {
    const { isLive, title } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { isLive: isLive, liveStreamTitle: title || "" }, 
      { new: true }
    );
    res.json({ success: true, isLive: user.isLive });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
};