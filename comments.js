// Create web server

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Object to store comments
const commentsByPostId = {};

// Endpoint to get comments by post id
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Endpoint to create comment
app.post('/posts/:id/comments', async (req, res) => {
  const commentId = generateId();
  const { content } = req.body;
  const comments = commentsByPostId[req.params.id] || [];
  comments.push({ id: commentId, content, status: 'pending' });

  // Update comments
  commentsByPostId[req.params.id] = comments;

  // Emit event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: req.params.id, status: 'pending' },
  });

  res.status(201).send(comments);
});

// Endpoint to receive events
app.post('/events', async (req, res) => {
  console.log('Event Received', req.body.type);

  const { type, data } = req.body;

  // Check if event is comment moderated
  if (type === 'CommentModerated') {
    const { id, postId, status, content } = data;

    // Get comments by post id
    const comments = commentsByPostId[postId];

    // Find comment to update
    const comment = comments.find((comment) => {
      return comment.id === id;
    });

    // Update comment
    comment.status = status;

    // Emit event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: { id, postId, status, content },
    });
  }

  res.send({});
});

// Generate random id
const generateId = () => {
  return Math.random().toString(36).substr(2, 7);
};

// Start server
app.listen(4001, () => {
  console.log('Listening on 4001');
});