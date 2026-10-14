import axios from "axios";

export const Get = (endPoint) =>
    axios.get(endPoint, { headers: { Accept: "application/json" } });
