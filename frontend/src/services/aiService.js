import api from "@/lib/api";

const aiService = {
  /**
   * Process raw text using AI to generate quotation items
   * @param {string} rawText - Raw text like "2 cameras, 1 DVR, wiring..."
   * @returns {Promise} - AI-generated quotation items
   */
  processQuotation: async (rawText) => {
    const response = await api.post("/ai/process", {
      strRawText: rawText
    });
    return response.data;
  }
};

export default aiService;
