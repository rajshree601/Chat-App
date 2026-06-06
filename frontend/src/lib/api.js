import axios from "axios";
import { fetchAuthSession } from "aws-amplify/auth";
import { config } from "./config";

export const api = axios.create({
  baseURL: config.apiUrl,
  timeout: 20000
});

api.interceptors.request.use(async (request) => {
  const session = await fetchAuthSession().catch(() => null);
  const token = session?.tokens?.accessToken?.toString();
  if (token) request.headers.Authorization = `Bearer ${token}`;
  return request;
});

export async function uploadToS3(file, mediaType) {
  const { data } = await api.post("/media/upload", {
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    mediaType
  });
  await axios.put(data.uploadUrl, file, {
    headers: { "Content-Type": file.type || "application/octet-stream" }
  });
  return { url: data.publicUrl, type: mediaType, name: file.name };
}

