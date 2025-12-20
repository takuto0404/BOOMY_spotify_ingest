import axios from "axios";
import { z } from "zod";

import { config } from "../config.js";

const tokenResponseSchema = z.object({
  access_token: z.string()
});

export const fetchSpotifyAccessToken = async (uid: string): Promise<string> => {
  const response = await axios.get(config.tokenBrokerUrl, {
    params: { uid },
    timeout: 10_000
  });

  const parsed = tokenResponseSchema.parse(response.data);
  return parsed.access_token;
};
