import axios from "axios";

export const Delete = (endPoint) =>
    axios.delete(endPoint, { headers: { Accept: "application/json" } });
