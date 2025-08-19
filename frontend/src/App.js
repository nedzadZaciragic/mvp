import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Alert, AlertDescription } from "./components/ui/alert";
import { 
  MessageCircle, Building2, MapPin, Phone, Mail, Plus, Send, Bot, User, 
  BarChart3, Settings, Palette, LogOut, Eye, TrendingUp, Users, 
  Calendar, Clock, Star, Home, Shield, Coffee, MapIcon
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setUser(userData);
    
    return userData;
  };

  const register = async (email, full_name, password) => {
    const response = await axios.post(`${API}/auth/register`, { 
      email, full_name, password 
    });
    const { access_token, user: userData } = response.data;
    
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setUser(userData);
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Login Component
const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      await login(formData.email, formData.password);
    } catch (error) {
      setError(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Welcome back</CardTitle>
          <CardDescription>Sign in to your My Host IQ account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
              required
            />
            
            <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          
          <div className="text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <button 
              onClick={() => window.location.href = '/register'}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Sign up
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Register Component
const Register = () => {
  const [formData, setFormData] = useState({ email: "", full_name: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      await register(formData.email, formData.full_name, formData.password);
    } catch (error) {
      setError(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Create account</CardTitle>
          <CardDescription>Start your AI-powered hospitality journey</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Full name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({...prev, full_name: e.target.value}))}
              required
            />
            <Input
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
              required
            />
            <Input
              type="password"
              placeholder="Password (min 6 characters)"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
              required
              minLength={6}
            />
            
            <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          
          <div className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <button 
              onClick={() => window.location.href = '/login'}
              className="text-emerald-600 hover:text-emerald-800 font-medium"
            >
              Sign in
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Guest Chat Component (Enhanced with whitelabeling)
const GuestChat = ({ apartmentId }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [apartmentInfo, setApartmentInfo] = useState(null);
  const [branding, setBranding] = useState(null);
  const [sessionId] = useState(`guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    fetchApartmentInfo();
  }, [apartmentId]);

  const fetchApartmentInfo = async () => {
    try {
      const response = await axios.get(`${API}/public/apartments/${apartmentId}`);
      setApartmentInfo(response.data.apartment);
      setBranding(response.data.branding);
    } catch (error) {
      console.error("Error fetching apartment info:", error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = { type: 'user', content: inputMessage, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setLoading(true);

    try {
      const response = await axios.post(`${API}/chat`, {
        apartment_id: apartmentId,
        message: inputMessage,
        session_id: sessionId
      });

      const aiMessage = { 
        type: 'ai', 
        content: response.data.response, 
        timestamp: new Date().toISOString() 
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = { 
        type: 'ai', 
        content: "Sorry, I'm having trouble connecting. Please try again.", 
        timestamp: new Date().toISOString() 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (!apartmentInfo || !branding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const primaryColor = branding.brand_primary_color || "#6366f1";

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05)` }}>
      {/* Header with whitelabeling */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            {branding.brand_logo_url ? (
              <img src={branding.brand_logo_url} alt="Logo" className="h-8 w-8 rounded" />
            ) : (
              <div 
                className="p-2 rounded-lg" 
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <Building2 className="h-6 w-6" style={{ color: primaryColor }} />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{apartmentInfo.name}</h1>
              <p className="text-sm text-gray-600 flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {apartmentInfo.address}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-lg border h-[600px] flex flex-col">
          {/* Welcome Message */}
          <div 
            className="p-6 border-b text-white rounded-t-xl"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${branding.brand_secondary_color || "#10b981"})` }}
          >
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{branding.brand_name} AI Assistant</h2>
                <p className="text-white/90 text-sm">Ask me anything about your stay!</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Welcome to {branding.brand_name}!</p>
                <p className="text-sm">Ask about check-in, local recommendations, or apartment details</p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div 
                    className={`p-2 rounded-full ${
                      message.type === 'user' 
                        ? `text-white` 
                        : 'bg-gray-100'
                    }`}
                    style={message.type === 'user' ? { backgroundColor: primaryColor } : {}}
                  >
                    {message.type === 'user' ? (
                      <User className="h-5 w-5" />
                    ) : (
                      <Bot className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div className={`p-4 rounded-2xl ${
                    message.type === 'user' 
                      ? 'text-white rounded-br-sm' 
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}
                  style={message.type === 'user' ? { backgroundColor: primaryColor } : {}}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className={`text-xs mt-2 ${message.type === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-full bg-gray-100">
                    <Bot className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="bg-gray-100 p-4 rounded-2xl rounded-bl-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-6">
            <div className="flex space-x-4">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about check-in, local restaurants, apartment rules..."
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={loading}
              />
              <Button 
                onClick={sendMessage} 
                disabled={loading || !inputMessage.trim()}
                style={{ backgroundColor: primaryColor }}
                className="hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Analytics Dashboard Component
const AnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/dashboard`);
      setAnalyticsData(response.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  const { overview, apartments } = analyticsData;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-indigo-100 p-3 rounded-full">
                <Building2 className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{overview.total_apartments}</p>
                <p className="text-gray-600 text-sm">Total Apartments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-emerald-100 p-3 rounded-full">
                <MessageCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{overview.total_chats}</p>
                <p className="text-gray-600 text-sm">Total Chats</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{overview.active_apartments}</p>
                <p className="text-gray-600 text-sm">Active Apartments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-full">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{Math.round(overview.avg_chats_per_apartment)}</p>
                <p className="text-gray-600 text-sm">Avg Chats/Apartment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Apartment Details */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Apartment Performance</h3>
        {apartments.map((apartment) => (
          <Card key={apartment.apartment_id} className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">{apartment.apartment_name}</CardTitle>
              <CardDescription>
                {apartment.total_chats} total chats • {apartment.total_sessions} sessions
                {apartment.last_chat && (
                  <span> • Last chat: {new Date(apartment.last_chat).toLocaleDateString()}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Popular Questions */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center">
                    <Star className="h-4 w-4 mr-2" />
                    Popular Questions
                  </h4>
                  {apartment.popular_questions.length > 0 ? (
                    <div className="space-y-2">
                      {apartment.popular_questions.map((q, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm truncate">{q.question}</span>
                          <Badge variant="outline">{q.count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No questions yet</p>
                  )}
                </div>

                {/* Daily Activity */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Last 7 Days Activity
                  </h4>
                  <div className="space-y-2">
                    {apartment.daily_chats.map((day, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{new Date(day.date).toLocaleDateString()}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ 
                                width: `${Math.min(100, (day.chats / Math.max(...apartment.daily_chats.map(d => d.chats), 1)) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{day.chats}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Host Dashboard Component (Enhanced)
const HostDashboard = () => {
  const { user, logout } = useAuth();
  const [apartments, setApartments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("apartments");
  const [whitelabelData, setWhitelabelData] = useState({
    brand_name: user?.brand_name || "My Host IQ",
    brand_logo_url: user?.brand_logo_url || "",
    brand_primary_color: user?.brand_primary_color || "#6366f1",
    brand_secondary_color: user?.brand_secondary_color || "#10b981"
  });
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    description: "",
    rules: [],
    contact: { phone: "", email: "" },
    recommendations: {
      restaurants: [],
      hidden_gems: [],
      transport: ""
    }
  });
  const [newRule, setNewRule] = useState("");
  const [newRestaurant, setNewRestaurant] = useState({ name: "", type: "", tip: "" });
  const [newGem, setNewGem] = useState({ name: "", tip: "" });

  useEffect(() => {
    fetchApartments();
    if (user) {
      setWhitelabelData({
        brand_name: user.brand_name || "My Host IQ",
        brand_logo_url: user.brand_logo_url || "",
        brand_primary_color: user.brand_primary_color || "#6366f1",
        brand_secondary_color: user.brand_secondary_color || "#10b981"
      });
    }
  }, [user]);

  const fetchApartments = async () => {
    try {
      const response = await axios.get(`${API}/apartments`);
      setApartments(response.data);
    } catch (error) {
      console.error("Error fetching apartments:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/apartments`, formData);
      setFormData({
        name: "",
        address: "",
        description: "",
        rules: [],
        contact: { phone: "", email: "" },
        recommendations: {
          restaurants: [],
          hidden_gems: [],
          transport: ""
        }
      });
      setShowForm(false);
      fetchApartments();
    } catch (error) {
      console.error("Error creating apartment:", error);
    }
  };

  const updateWhitelabelSettings = async () => {
    try {
      await axios.put(`${API}/auth/whitelabel`, whitelabelData);
      alert("Branding settings updated successfully!");
    } catch (error) {
      console.error("Error updating whitelabel settings:", error);
      alert("Error updating settings");
    }
  };

  const addRule = () => {
    if (newRule.trim()) {
      setFormData(prev => ({
        ...prev,
        rules: [...prev.rules, newRule.trim()]
      }));
      setNewRule("");
    }
  };

  const addRestaurant = () => {
    if (newRestaurant.name.trim()) {
      setFormData(prev => ({
        ...prev,
        recommendations: {
          ...prev.recommendations,
          restaurants: [...prev.recommendations.restaurants, newRestaurant]
        }
      }));
      setNewRestaurant({ name: "", type: "", tip: "" });
    }
  };

  const addGem = () => {
    if (newGem.name.trim()) {
      setFormData(prev => ({
        ...prev,
        recommendations: {
          ...prev.recommendations,
          hidden_gems: [...prev.recommendations.hidden_gems, newGem]
        }
      }));
      setNewGem({ name: "", tip: "" });
    }
  };

  const generateGuestLink = (apartmentId) => {
    return `${window.location.origin}/guest/${apartmentId}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {whitelabelData.brand_name}
              </h1>
              <p className="text-gray-600 mt-1">Welcome, {user?.full_name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Apartment
              </Button>
              <Button onClick={logout} variant="outline">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="apartments" className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>Apartments</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="whitelabel" className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Branding</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Apartments Tab */}
          <TabsContent value="apartments">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apartments.map((apartment) => (
                <Card key={apartment.id} className="hover:shadow-lg transition-shadow border-0 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
                    <CardTitle className="text-lg">{apartment.name}</CardTitle>
                    <CardDescription className="text-indigo-100 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {apartment.address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-gray-600 text-sm mb-4">{apartment.description}</p>
                    
                    {apartment.rules?.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm text-gray-700 mb-2">Rules:</h4>
                        <div className="flex flex-wrap gap-1">
                          {apartment.rules.slice(0, 3).map((rule, index) => (
                            <Badge key={index} variant="outline" className="text-xs">{rule}</Badge>
                          ))}
                          {apartment.rules.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{apartment.rules.length - 3} more</Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded">
                      <div className="text-center">
                        <p className="text-lg font-bold text-indigo-600">{apartment.total_chats || 0}</p>
                        <p className="text-xs text-gray-600">Total Chats</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-600">{apartment.total_sessions || 0}</p>
                        <p className="text-xs text-gray-600">Sessions</p>
                      </div>
                    </div>

                    <Separator className="my-4" />
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Guest Link:</span>
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-xs break-all">
                        {generateGuestLink(apartment.id)}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => navigator.clipboard.writeText(generateGuestLink(apartment.id))}
                        >
                          Copy Link
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => window.open(generateGuestLink(apartment.id), '_blank')}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          {/* Whitelabel Tab */}
          <TabsContent value="whitelabel">
            <Card>
              <CardHeader>
                <CardTitle>Brand Customization</CardTitle>
                <CardDescription>
                  Customize how your AI assistant appears to guests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Brand Name
                      </label>
                      <Input
                        value={whitelabelData.brand_name}
                        onChange={(e) => setWhitelabelData(prev => ({...prev, brand_name: e.target.value}))}
                        placeholder="My Host IQ"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Logo URL (optional)
                      </label>
                      <Input
                        value={whitelabelData.brand_logo_url}
                        onChange={(e) => setWhitelabelData(prev => ({...prev, brand_logo_url: e.target.value}))}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Color
                      </label>
                      <div className="flex space-x-2">
                        <Input
                          type="color"
                          value={whitelabelData.brand_primary_color}
                          onChange={(e) => setWhitelabelData(prev => ({...prev, brand_primary_color: e.target.value}))}
                          className="w-16"
                        />
                        <Input
                          value={whitelabelData.brand_primary_color}
                          onChange={(e) => setWhitelabelData(prev => ({...prev, brand_primary_color: e.target.value}))}
                          placeholder="#6366f1"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Secondary Color
                      </label>
                      <div className="flex space-x-2">
                        <Input
                          type="color"
                          value={whitelabelData.brand_secondary_color}
                          onChange={(e) => setWhitelabelData(prev => ({...prev, brand_secondary_color: e.target.value}))}
                          className="w-16"
                        />
                        <Input
                          value={whitelabelData.brand_secondary_color}
                          onChange={(e) => setWhitelabelData(prev => ({...prev, brand_secondary_color: e.target.value}))}
                          placeholder="#10b981"
                        />
                      </div>
                    </div>
                    
                    <Button onClick={updateWhitelabelSettings} className="w-full">
                      Update Branding
                    </Button>
                  </div>
                  
                  {/* Preview */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-gray-900">Preview</h3>
                    <div 
                      className="p-4 rounded-lg text-white"
                      style={{ 
                        background: `linear-gradient(135deg, ${whitelabelData.brand_primary_color}, ${whitelabelData.brand_secondary_color})` 
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        {whitelabelData.brand_logo_url ? (
                          <img src={whitelabelData.brand_logo_url} alt="Logo" className="h-8 w-8 rounded" />
                        ) : (
                          <div className="bg-white/20 p-2 rounded-lg">
                            <Bot className="h-6 w-6" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold">{whitelabelData.brand_name} AI Assistant</h4>
                          <p className="text-white/90 text-sm">Ask me anything about your stay!</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <Input value={user?.email} disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <Input value={user?.full_name} disabled />
                  </div>
                  <div className="pt-4">
                    <Button variant="destructive" onClick={logout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Apartment Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Apartment</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
                    
                    <Input
                      placeholder="Apartment Name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                      required
                    />
                    
                    <Input
                      placeholder="Address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({...prev, address: e.target.value}))}
                      required
                    />
                    
                    <Textarea
                      placeholder="Description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                      required
                    />
                  </div>

                  {/* Contact */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Phone className="h-5 w-5 mr-2" />
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="Phone"
                        value={formData.contact.phone}
                        onChange={(e) => setFormData(prev => ({
                          ...prev, 
                          contact: {...prev.contact, phone: e.target.value}
                        }))}
                      />
                      <Input
                        placeholder="Email"
                        type="email"
                        value={formData.contact.email}
                        onChange={(e) => setFormData(prev => ({
                          ...prev, 
                          contact: {...prev.contact, email: e.target.value}
                        }))}
                      />
                    </div>
                  </div>

                  {/* Rules */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Shield className="h-5 w-5 mr-2" />
                      Apartment Rules
                    </h3>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Add a rule (e.g., No smoking)"
                        value={newRule}
                        onChange={(e) => setNewRule(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRule())}
                      />
                      <Button type="button" onClick={addRule}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.rules.map((rule, index) => (
                        <Badge key={index} className="bg-red-100 text-red-800">{rule}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Restaurant Recommendations */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Coffee className="h-5 w-5 mr-2" />
                      Restaurant Recommendations
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Restaurant name"
                        value={newRestaurant.name}
                        onChange={(e) => setNewRestaurant(prev => ({...prev, name: e.target.value}))}
                      />
                      <Input
                        placeholder="Type (e.g., Italian)"
                        value={newRestaurant.type}
                        onChange={(e) => setNewRestaurant(prev => ({...prev, type: e.target.value}))}
                      />
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Tip/Note"
                          value={newRestaurant.tip}
                          onChange={(e) => setNewRestaurant(prev => ({...prev, tip: e.target.value}))}
                        />
                        <Button type="button" onClick={addRestaurant}>Add</Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {formData.recommendations.restaurants.map((rest, index) => (
                        <div key={index} className="bg-green-50 p-3 rounded-lg">
                          <strong>{rest.name}</strong> ({rest.type}) - {rest.tip}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hidden Gems */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <MapIcon className="h-5 w-5 mr-2" />
                      Hidden Gems
                    </h3>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Place name"
                        value={newGem.name}
                        onChange={(e) => setNewGem(prev => ({...prev, name: e.target.value}))}
                      />
                      <Input
                        placeholder="Tip/Description"
                        value={newGem.tip}
                        onChange={(e) => setNewGem(prev => ({...prev, tip: e.target.value}))}
                      />
                      <Button type="button" onClick={addGem}>Add</Button>
                    </div>
                    <div className="space-y-2">
                      {formData.recommendations.hidden_gems.map((gem, index) => (
                        <div key={index} className="bg-blue-50 p-3 rounded-lg">
                          <strong>{gem.name}</strong> - {gem.tip}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transport */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Transport Information</h3>
                    <Textarea
                      placeholder="Transport details (e.g., Bus 64 to Vatican, Metro A to Termini)"
                      value={formData.recommendations.transport}
                      onChange={(e) => setFormData(prev => ({
                        ...prev, 
                        recommendations: {...prev.recommendations, transport: e.target.value}
                      }))}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-4 pt-6">
                    <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                      Create Apartment
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Landing Home Component (Enhanced)
const LandingHome = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            My <span className="text-indigo-600">Host</span> IQ
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transform your apartment into a smart hospitality experience with AI-powered guest assistance. 
            Provide personalized recommendations, instant answers, and exceptional service 24/7.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              onClick={() => window.location.href = '/register'} 
              size="lg" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 text-lg"
            >
              Start Free Trial
            </Button>
            <Button 
              onClick={() => window.location.href = '/login'} 
              variant="outline" 
              size="lg" 
              className="px-8 py-4 text-lg"
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <Card className="text-center p-8 border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="h-8 w-8 text-indigo-600" />
            </div>
            <CardTitle className="mb-4">AI-Powered Concierge</CardTitle>
            <CardDescription>
              Your guests get instant answers about check-in, local recommendations, and apartment rules through an intelligent AI assistant.
            </CardDescription>
          </Card>

          <Card className="text-center p-8 border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="mb-4">Advanced Analytics</CardTitle>
            <CardDescription>
              Track guest interactions, popular questions, and apartment performance with detailed analytics and insights.
            </CardDescription>
          </Card>

          <Card className="text-center p-8 border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Palette className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="mb-4">White-label Branding</CardTitle>
            <CardDescription>
              Customize your AI assistant with your own branding, colors, and logo for a professional guest experience.
            </CardDescription>
          </Card>
        </div>

        {/* Pricing Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple Pricing</h2>
          <p className="text-gray-600 mb-12">€15 per apartment per month. No setup fees, no contracts.</p>
          
          <Card className="max-w-md mx-auto shadow-xl border-2 border-indigo-200">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <CardTitle className="text-2xl">Pro Plan</CardTitle>
              <CardDescription className="text-indigo-100">Everything you need to get started</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <span className="text-4xl font-bold text-gray-900">€15</span>
                <span className="text-gray-600">/apartment/month</span>
              </div>
              
              <ul className="space-y-3 text-left">
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></div>
                  Unlimited AI conversations
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></div>
                  Advanced analytics dashboard
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></div>
                  White-label branding
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></div>
                  24/7 AI support
                </li>
                <li className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></div>
                  Custom recommendations
                </li>
              </ul>
              
              <Button 
                className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => window.location.href = '/register'}
              >
                Start Free Trial
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

// Main App
function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingHome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <HostDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/guest/:apartmentId" element={<GuestChatWrapper />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

// Wrapper component to extract apartmentId from URL
const GuestChatWrapper = () => {
  const apartmentId = window.location.pathname.split('/guest/')[1];
  return <GuestChat apartmentId={apartmentId} />;
};

export default App;