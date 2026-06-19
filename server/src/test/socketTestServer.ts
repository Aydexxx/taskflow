import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app';
import { createSocketServer, type TypedSocketServer } from '../socket';

export interface SocketTestServer {
  io: TypedSocketServer;
  url: string;
  close: () => Promise<void>;
}

/** Starts the real Express + Socket.IO server on a random free port, for socket-level tests. */
export async function startSocketTestServer(): Promise<SocketTestServer> {
  const app = createApp();
  const httpServer = createServer(app);
  const io = createSocketServer(httpServer);

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address() as AddressInfo;

  return {
    io,
    url: `http://localhost:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        io.close();
        httpServer.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
