import axios from "axios";

export const Post = (endPoint, data) =>
    axios.post(endPoint, data, { headers: { Accept: "application/json" } });
