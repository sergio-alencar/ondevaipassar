import axios from "axios";

class HttpService {
  constructor(config) {
    this.config = config;
  }

  async get(url, retries = 3) {
    try {
      const response = await axios.get(url, {
        timeout: this.config.TIMEOUT,
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      if (retries > 0) {
        await this.delay(this.config.REQUEST_DELAY * 2);
        return this.get(url, retries - 1);
      }
      throw error;
    }
  }

  getHeaders() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: "https://www.google.com/",
      DNT: "1",
      Connection: "keep-alive",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "cross-site",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    };
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default HttpService;
