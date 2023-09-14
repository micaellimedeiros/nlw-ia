import { FastifyInstance } from "fastify";

import { fastifyMultipart } from "@fastify/multipart";
import path from "node:path";
import fs from "node:fs";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { prisma } from "../lib/prisma";

const pump = promisify(pipeline);

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1048576 * 25,
    },
  });

  app.post("/videos", async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ message: "No file uploaded" });
    }

    const extension = path.extname(data.filename);

    if (extension !== ".mp3") {
      return reply.status(400).send({ message: "Invalid file type" });
    }

    const fileBaseName = path.basename(data.filename, extension);

    const fileUploadName = `${fileBaseName}-${Date.now()}${extension}`;

    const uploadDirectory = path.resolve(
      __dirname,
      "../../tmp",
      fileUploadName
    );

    await pump(data.file, fs.createWriteStream(uploadDirectory));

    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDirectory,
      },
    });

    return reply.status(200).send({ video });
  });
}
