// API client for communicating with the Express backend

const API_BASE = "/api";

export const api = {
  // Bot operations
  async getBots(userId: string) {
    const response = await fetch(`${API_BASE}/bots?userId=${userId}`);
    if (!response.ok) throw new Error("Failed to fetch bots");
    return response.json();
  },

  async getBotStats(botId: string) {
    const response = await fetch(`${API_BASE}/bots/${botId}/stats`);
    if (!response.ok) throw new Error("Failed to fetch bot stats");
    return response.json();
  },

  async createBot(data: any) {
    const response = await fetch(`${API_BASE}/bots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create bot");
    return response.json();
  },

  async updateBot(botId: string, data: any) {
    const response = await fetch(`${API_BASE}/bots/${botId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update bot");
    return response.json();
  },

  async deleteBot(botId: string) {
    const response = await fetch(`${API_BASE}/bots/${botId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete bot");
    return response.json();
  },

  // Mini games
  async getGameSession(userId: string, gameType: string) {
    const response = await fetch(`${API_BASE}/minigames/${gameType}/session?userId=${userId}`);
    if (!response.ok) throw new Error("Failed to fetch game session");
    return response.json();
  },
};

// Simple session management (replace Supabase auth)
export const session = {
  getUser() {
    const userId = localStorage.getItem("userId");
    const email = localStorage.getItem("userEmail");
    if (!userId) return null;
    return { id: userId, email: email || "demo@example.com" };
  },

  setUser(userId: string, email?: string) {
    localStorage.setItem("userId", userId);
    if (email) localStorage.setItem("userEmail", email);
  },

  clearUser() {
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
  },
};
