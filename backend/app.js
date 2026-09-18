import http from 'node:http';
import express from 'express';
import cors from 'cors';
import 'dotenv/config.js';
import {notFound, errorHandler} from './middleware/errorHandler.js';
import { connectDB } from './config/db.js';
import authRouter from './router/auth.js'
import uploadRouter from './router/upload.js'
import postRouter from './router/post.js'
import friendRouter from './router/friend.js'
import groupRouter from './router/group.js'
import commentRouter from './router/comment.js'
import conversationRouter from './router/conversation.js'
import storyRouter from './router/story.js'
import notificationRouter from './router/notification.js'
import { attachRealtime, REALTIME_PATH } from './lib/realtime.js';
import { registerRealtimeHandlers } from './service/realtimeHandlers.js';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/index.js';
import { allowedOrigins, isAllowedOrigin, corsOptions } from './config/origins.js';


const app = express();

const PORT = process.env.PORT || 5000
    




app.use(cors(corsOptions));

app.get('/health', (req, res) => res.json({ ok: true, origins: allowedOrigins }));

app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));


app.use(helmet())
// Disable x-powered-by
app.disable('x-powered-by');

app.use('/api/auth', authRouter)
app.use('/api/upload',uploadRouter)
app.use('/api/comment',commentRouter)
app.use('/api/posts',postRouter)
app.use('/api/friend',friendRouter);
app.use('/api/groups',groupRouter);
app.use('/api/conversations',conversationRouter);
app.use('/api/stories',storyRouter);
app.use('/api/notifications',notificationRouter);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
    try {
       await connectDB();

       const server = http.createServer(app);
       registerRealtimeHandlers();
       const realtime = await attachRealtime(server, { isAllowedOrigin });

       server.listen(PORT, ()=>{
            console.log(`Server running at http://localhost:${PORT}`);
            console.log(`Realtime at ws://localhost:${PORT}${REALTIME_PATH} (${realtime.bus} bus)`);
        })
    } catch (error) {;
      console.error('Failed to start server:', error.message);
     process.exit(1); 
        
    }
};


start();