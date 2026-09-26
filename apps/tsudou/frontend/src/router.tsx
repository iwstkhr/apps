import { createBrowserRouter } from 'react-router';
import { EventCreated } from './routes/EventCreated';
import { EventManage } from './routes/EventManage';
import { EventPublic } from './routes/EventPublic';
import { Guide } from './routes/Guide';
import { Home } from './routes/Home';
import { NotFound } from './routes/NotFound';
import { Root } from './routes/Root';

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
