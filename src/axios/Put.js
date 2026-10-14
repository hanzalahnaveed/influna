import axios from "axios";

export const Put = (endPoint, data) =>
    axios.put(endPoint, data, { headers: { Accept: "application/json" } });
