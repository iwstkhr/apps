import { createBrowserRouter } from 'react-router';
import { EventCreated } from './routes/event-created';
import { EventManage } from './routes/event-manage';
import { EventPublic } from './routes/event-public';
import { Guide } from './routes/guide';
import { Home } from './routes/home';
import { NotFound } from './routes/not-found';
import { Root } from './routes/root';

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { index: true, element: <Home /> },
      { path: 'guide', element: <Guide /> },
      { path: 'e/:eventId', element: <EventPublic /> },
      { path: 'e/:eventId/created', element: <EventCreated /> },
      { path: 'e/:eventId/manage', element: <EventManage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
