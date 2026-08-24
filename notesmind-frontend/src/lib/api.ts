const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = "API request failed";
    try {
      const errorData = await response.json();
      errorMsg = errorData.detail || errorMsg;
    } catch (e) {
      // Ignore JSON parse error if response is not JSON
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  get: (endpoint: string, options?: RequestInit) => fetchWithAuth(endpoint, options),
  post: (endpoint: string, body: any, options?: RequestInit) => 
    fetchWithAuth(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    }),
  put: (endpoint: string, body: any, options?: RequestInit) => 
    fetchWithAuth(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
      ...options,
    }),
  delete: (endpoint: string, options?: RequestInit) => fetchWithAuth(endpoint, { method: "DELETE", ...options }),
  postForm: async (endpoint: string, formData: FormData) => {
    // For login which expects x-www-form-urlencoded
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      body: new URLSearchParams(formData as any),
    });
    
    if (!response.ok) {
      throw new Error("API request failed");
    }
    return response.json();
  }
};
