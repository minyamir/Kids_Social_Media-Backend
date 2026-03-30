const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// 1. Get all conversations (The Inbox)
exports.getConversations = async (req, res) => {
  try {
    const chats = await Conversation.find({
      participants: req.user._id 
    })
    .populate('participants', 'username avatarUrl')
    .sort({ lastUpdatedAt: -1 });

    const formatted = chats.map(chat => {
      const otherUser = chat.participants.find(
        p => p._id.toString() !== req.user._id.toString()
      );
      return {
        _id: chat._id,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastUpdatedAt, // Use lastUpdatedAt for sorting
        otherUser
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching inbox" });
  }
};

// 2. Get messages for a specific chat
exports.getMessages = async (req, res) => {
  try {
    const { otherUserId } = req.params;

    const conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, otherUserId] }
    });

    if (!conversation) return res.json([]);

    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching messages" });
  }
};
exports.sendMessage = async (req, res) => {
  const { receiverId, text } = req.body;
  const senderId = req.user._id;
  const io = req.app.get("socketio");

  try {
    // 1. Find or Create Conversation
    let conv = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] }
    });

    if (!conv) {
      conv = await Conversation.create({ participants: [senderId, receiverId] });
    }

    // 2. Create the Message object
    const newMessage = await Message.create({
      conversationId: conv._id,
      sender: senderId,
      text
    });

    // 3. Update Conversation (Crucial for ChatList "Bumping")
    conv.lastMessage = text;
    // We use updatedAt to track the latest activity
    await conv.save(); 

    // 🔍 THE DEBUG LOGS
    console.log("------------------------------------");
    console.log("SENDING TO ROOM:", receiverId.toString());
    
    // 4. 🔥 SOCKET EMITS
    // Emit the message bubble
    io.to(receiverId.toString()).emit("receive_message", newMessage);
    io.to(senderId.toString()).emit("receive_message", newMessage);

    // Update the Inbox/Sidebar for the receiver
    const inboxUpdate = {
      _id: conv._id,
      lastMessage: text,
      lastMessageTime: conv.updatedAt,
      otherUser: {
        _id: senderId,
        username: req.user.username,
        avatarUrl: req.user.avatarUrl
      }
    };
    io.to(receiverId.toString()).emit("update_chat_list", inboxUpdate);

    console.log("✅ Socket emits finished");
    console.log("------------------------------------");

    res.json(newMessage);
  } catch (err) {
    console.error("Chat Controller Error:", err);
    res.status(500).json({ msg: "Transmission failed" });
  }
};