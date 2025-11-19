import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { 
  MessageCircle, Building2, MapPin, Phone, Mail, Plus, Send, Bot, User, 
  BarChart3, Settings, Palette, LogOut, Eye, TrendingUp, Users, 
  Calendar, Clock, Star, Home, Shield, Coffee, MapIcon, CreditCard,
  CheckCircle, Zap, Globe, PlayCircle, ArrowRight, DollarSign,
  Activity, Download, Upload, Link as LinkIcon, PieChart, Car,
  QrCode, FileText, Printer, MousePointer, Smartphone, UserPlus,
  PaintBucket, BarChart, Target, Sparkles, Edit, AlertTriangle,
  Headphones, Volume2, VolumeX, BookOpen, Briefcase, Trash2, Check
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Updated brand colors - much lighter blue tones
const BRAND_COLORS = {
  primary: "#93c5fd", // Much lighter blue
  secondary: "#bfdbfe", // Very light blue
  accent: "#dbeafe", // Super light blue
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444"
};

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
      console.error('Error fetching profile:', error);
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

  const register = async (email, full_name, password, phone = "") => {
    const response = await axios.post(`${API}/auth/register`, { 
      email, full_name, password, phone 
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

// Forgot Password Component
const ForgotPassword = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setMessage('If your email is registered, you will receive a password reset link shortly.');
      setEmail('');
    } catch (error) {
      setMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-600">
            <Mail className="h-5 w-5 mr-2" />
            Reset Password
          </CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="text-center space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-green-700 text-sm">{message}</p>
              </div>
              <Button onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <Button 
                    onClick={() => setEditingApartment(null)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                    Save All Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apartments List */}
      <div className="space-y-4">
        {apartments.map((apartment) => (
          <Card key={apartment.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">{apartment.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    ID: {apartment.id.slice(0, 8)}...
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  
                            
                            {/* Booking.com Instructions */}
                            <div className="bg-white/70 p-3 rounded-lg">
                              <h5 className="font-bold text-blue-700 mb-2">🌐 Booking.com:</h5>
                              <ol className="list-decimal list-inside space-y-1 text-amber-900">
                                <li>Go to your <strong>Extranet dashboard</strong></li>
                                <li>Navigate to <strong>"Rates & Availability"</strong></li>
                                <li>Select <strong>"Calendar"</strong></li>
                                <li>Click <strong>"Calendar sync"</strong> or <strong>"Import/Export"</strong></li>
                                <li>Find <strong>"Export calendar"</strong> section</li>
                                <li>Copy the <strong>iCal URL</strong></li>
                              </ol>
                            </div>
                            
                            {/* VRBO/HomeAway Instructions */}
                            <div className="bg-white/70 p-3 rounded-lg">
                              <h5 className="font-bold text-purple-700 mb-2">🏡 VRBO/HomeAway:</h5>
                              <ol className="list-decimal list-inside space-y-1 text-amber-900">
                                <li>Go to your <strong>Owner Dashboard</strong></li>
                                <li>Click <strong>"Calendar"</strong></li>
                                <li>Select <strong>"Sync Calendars"</strong></li>
                                <li>Choose <strong>"Export"</strong></li>
                                <li>Copy the <strong>iCal feed URL</strong></li>
                              </ol>
                            </div>
                            
                            {/* General Tips */}
                            <div className="bg-white/70 p-3 rounded-lg border-l-4 border-green-500">
                              <h5 className="font-bold text-green-700 mb-2">💡 Pro Tips:</h5>
                              <ul className="list-disc list-inside space-y-1 text-amber-900">
                                <li>URL usually starts with <code className="bg-gray-200 px-1 rounded">https://</code></li>
                                <li>Contains keywords like "ical", "calendar", or "export"</li>
                                <li>Ends with <code className="bg-gray-200 px-1 rounded">.ics</code> file extension</li>
                                <li>Keep this URL private - it contains your booking data</li>
                                <li>Test the URL in a browser - it should download a calendar file</li>
                              </ul>
                            </div>
                            
                            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                              <p className="text-red-800 text-xs">
                                <strong>⚠️ Important:</strong> Don't have a calendar URL? Most platforms generate this automatically. 
                                If you can't find it, contact your platform's support team and ask for your "iCal export URL" or "calendar sync URL".
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800 mb-2">
                          <strong>🚀 Automatic Guest Notifications</strong>
                        </p>
                        <p className="text-xs text-blue-700">
                          When you add an iCal URL, MyHostIQ will automatically:
                        </p>
                        <ul className="text-xs text-blue-600 mt-1 ml-4 list-disc">
                          <li>Monitor your calendar for new bookings</li>
                          <li>Extract guest email & phone from booking details</li>
                          <li>Send welcome messages with AI assistant link via email & WhatsApp</li>
                          <li>Notify guests about their personal concierge before arrival</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Rules */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Shield className="h-5 w-5 mr-2" />
                      Property Rules & Guidelines
                    </h3>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Add a rule (e.g., No smoking, Check-in after 2 PM)"
                        value={newRule}
                        onChange={(e) => setNewRule(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRule())}
                      />
                      <Button type="button" onClick={addRule}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.rules.map((rule, index) => (
                        <Badge key={index} className="bg-red-100 text-red-800 cursor-pointer hover:bg-red-200"
                               onClick={() => removeRule(index)}>
                          {rule} ✕
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Restaurant Recommendations */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Coffee className="h-5 w-5 mr-2" />
                      Restaurant & Dining Recommendations
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <Input
                        placeholder="Restaurant name"
                        value={newRestaurant.name}
                        onChange={(e) => setNewRestaurant(prev => ({...prev, name: e.target.value}))}
                      />
                      <Input
                        placeholder="Cuisine type"
                        value={newRestaurant.type}
                        onChange={(e) => setNewRestaurant(prev => ({...prev, type: e.target.value}))}
                      />
                      <AddressAutocomplete
                        placeholder="Restaurant location/address"
                        value={newRestaurant.location}
                        onChange={(value) => setNewRestaurant(prev => ({...prev, location: value}))}
                        onCoordinatesChange={(coords) => setNewRestaurant(prev => ({...prev, coordinates: coords}))}
                      />
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Your tip or note"
                          value={newRestaurant.tip}
                          onChange={(e) => setNewRestaurant(prev => ({...prev, tip: e.target.value}))}
                        />
                        <Button type="button" onClick={addRestaurant}>Add</Button>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {formData.recommendations.restaurants.map((rest, index) => (
                        <div key={index} className="bg-green-50 p-3 rounded-lg text-sm flex justify-between items-start">
                          <div>
                            <strong>{rest.name}</strong> ({rest.type})
                            {rest.location && <div className="text-gray-600">📍 {rest.location}</div>}
                            <div className="text-gray-700">{rest.tip}</div>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeRestaurant(index)}
                            className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hidden Gems */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <MapIcon className="h-5 w-5 mr-2" />
                      Hidden Gems & Local Attractions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input
                        placeholder="Place or attraction name"
                        value={newGem.name}
                        onChange={(e) => setNewGem(prev => ({...prev, name: e.target.value}))}
                      />
                      <AddressAutocomplete
                        placeholder="Attraction location/address"
                        value={newGem.location}
                        onChange={(value) => setNewGem(prev => ({...prev, location: value}))}
                        onCoordinatesChange={(coords) => setNewGem(prev => ({...prev, coordinates: coords}))}
                      />
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Why is it special? Your personal tip"
                          value={newGem.tip}
                          onChange={(e) => setNewGem(prev => ({...prev, tip: e.target.value}))}
                        />
                        <Button type="button" onClick={addGem}>Add</Button>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {formData.recommendations.hidden_gems.map((gem, index) => (
                        <div key={index} className="bg-blue-50 p-3 rounded-lg text-sm flex justify-between items-start">
                          <div>
                            <strong>{gem.name}</strong>
                            {gem.location && <div className="text-gray-600">📍 {gem.location}</div>}
                            <div className="text-gray-700">{gem.tip}</div>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeGem(index)}
                            className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transport */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Car className="h-5 w-5 mr-2" />
                      Transportation & Getting Around
                    </h3>
                    <Textarea
                      placeholder="Transport details: Bus routes, metro stations, taxi apps, parking information, walking distances to attractions..."
                      value={formData.recommendations.transport}
                      onChange={(e) => setFormData(prev => ({
                        ...prev, 
                        recommendations: {...prev.recommendations, transport: e.target.value}
                      }))}
                      rows={3}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-4 pt-6 border-t">
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                      {editingApartment ? "Update Property" : "Create Property"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowForm(false);
                        setEditingApartment(null);
                        resetFormData();
                      }} 
                      className="flex-1"
                    >
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

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading MyHostIQ...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingHome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <HostDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/guest/:apartmentId" element={<GuestChatWrapper />} />
            <Route path="/guest-login/:apartmentId" element={<GuestLoginChatWrapper />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

const GuestChatWrapper = () => {
  const apartmentId = window.location.pathname.split('/guest/')[1];
  return <GuestChat apartmentId={apartmentId} />;
};

const GuestLoginChatWrapper = () => {
  const apartmentId = window.location.pathname.split('/guest-login/')[1];
  return <GuestChat apartmentId={apartmentId} />;
};

export default App;