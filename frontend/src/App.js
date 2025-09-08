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
  Headphones, Volume2, VolumeX, BookOpen, Briefcase
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Updated brand colors based on the logo
const BRAND_COLORS = {
  primary: "#2563eb", // Blue from logo
  secondary: "#1d4ed8", // Darker blue
  accent: "#3b82f6", // Light blue
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  We'll send you a secure link to reset your password. The link will expire in 1 hour.
                </p>
              </div>

              <div className="flex space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || !email}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Reset Password Page Component
const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  
  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  useEffect(() => {
    if (!token) {
      navigate('/');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: password
      });
      
      setSuccess(true);
      setMessage('Password reset successfully! You can now login with your new password.');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-600">
            <Shield className="h-5 w-5 mr-2" />
            Reset Your Password
          </CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-700 font-medium">Password Reset Successful!</p>
                <p className="text-green-600 text-sm mt-2">{message}</p>
              </div>
              <p className="text-gray-500 text-sm">Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {message && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-700">{message}</AlertDescription>
                </Alert>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading || !password || !confirmPassword}
                className="w-full"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>

              <div className="text-center">
                <Button 
                  type="button" 
                  variant="link" 
                  onClick={() => navigate('/')}
                  className="text-blue-600"
                >
                  Back to Home
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Address Autocomplete Component using OpenStreetMap
const AddressAutocomplete = ({ value, onChange, placeholder = "Enter address..." }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const fetchSuggestions = async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      
      const formattedSuggestions = data.map(item => ({
        display_name: item.display_name,
        lat: item.lat,
        lon: item.lon
      }));
      
      setSuggestions(formattedSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Address autocomplete error:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Debounce the API call
    clearTimeout(window.addressTimeout);
    window.addressTimeout = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pr-8"
        />
        {loading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
        <MapPin className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 text-sm"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{suggestion.display_name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showSuggestions && suggestions.length === 0 && !loading && value.length >= 3 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <div className="flex items-center space-x-2 text-gray-500 text-sm">
            <MapPin className="h-4 w-4" />
            <span>No addresses found</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Airbnb/Booking.com Link Integration Component
const PropertyLinkImporter = ({ onDataImported }) => {
  const [showImporter, setShowImporter] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const extractPropertyData = async (url) => {
    // Call the backend API to scrape real data
    try {
      const response = await axios.post(`${API}/apartments/import-from-url`, { url });
      return response.data.data; // The scraped property data
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to import property data');
    }
  };

  const handleImport = async () => {
    if (!linkUrl.trim()) {
      setError('Please enter a property URL');
      return;
    }

    // Basic URL validation
    if (!linkUrl.includes('airbnb.com') && !linkUrl.includes('booking.com') && !linkUrl.includes('vrbo.com')) {
      setError('Please enter a valid Airbnb, Booking.com, or VRBO URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const extractedData = await extractPropertyData(linkUrl);
      onDataImported(extractedData);
      setShowImporter(false);
      setLinkUrl('');
    } catch (err) {
      setError(err.message || 'Failed to extract property data. Please try again or fill manually.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowImporter(true)}
        className="w-full mb-4 border-dashed border-2 border-blue-300 text-blue-600 hover:bg-blue-50"
      >
        <LinkIcon className="h-4 w-4 mr-2" />
        🚀 Quick Import from Airbnb/Booking.com Link
      </Button>

      {showImporter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-600">
                <LinkIcon className="h-5 w-5 mr-2" />
                Import Property from Listing URL
              </CardTitle>
              <CardDescription>
                Paste your Airbnb, Booking.com, or VRBO listing URL to auto-fill property details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Listing URL
                </label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://airbnb.com/rooms/12345678"
                  disabled={loading}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Supported Platforms:</h4>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• ✅ Airbnb.com listing URLs</p>
                  <p>• ✅ Booking.com property URLs</p>
                  <p>• ✅ VRBO.com listing URLs</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-amber-900 mb-2">⚠️ Important Note:</h4>
                <div className="text-xs text-amber-700 space-y-1">
                  <p>• Airbnb has strong bot protection - some data may not extract</p>
                  <p>• If import shows "please enter manually", that's normal</p>
                  <p>• The system still saves time by setting up the form structure</p>
                  <p>• You can edit all imported information before saving</p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowImporter(false);
                    setLinkUrl('');
                    setError('');
                  }}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={loading || !linkUrl.trim()}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Import Property
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

// QR Code Generator Component (Enhanced)
const QRCodeGenerator = ({ apartmentId, apartmentName, brandName, onClose }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const qrRef = useRef(null);
  const guestUrl = `${window.location.origin}/guest/${apartmentId}`;

  useEffect(() => {
    generateQRCode();
  }, [apartmentId]);

  const generateQRCode = async () => {
    try {
      const qrDataURL = await QRCode.toDataURL(guestUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: BRAND_COLORS.primary,
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrDataURL);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const downloadPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Add title with new branding
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(BRAND_COLORS.primary);
    pdf.text('MyHostIQ', 105, 25, { align: 'center' });
    
    pdf.setFontSize(18);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.text(apartmentName, 105, 40, { align: 'center' });
    
    // Enhanced instructions
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Your Personal AI Assistant', 105, 55, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Scan this QR code for instant help with:', 105, 70, { align: 'center' });
    
    const features = [
      '• Check-in instructions & apartment rules',
      '• Local restaurant recommendations', 
      '• Transport & navigation help',
      '• WiFi passwords & amenities',
      '• Emergency contact information',
      '• Hidden local gems & attractions'
    ];
    
    let yPos = 80;
    features.forEach(feature => {
      pdf.text(feature, 20, yPos);
      yPos += 8;
    });
    
    // Add QR code with border
    if (qrCodeUrl) {
      // Add border around QR code
      pdf.setDrawColor(BRAND_COLORS.primary);
      pdf.setLineWidth(2);
      pdf.rect(52, 130, 106, 106);
      pdf.addImage(qrCodeUrl, 'PNG', 55, 133, 100, 100);
    }
    
    // Add backup URL and instructions
    pdf.setFontSize(10);
    pdf.text('Can\'t scan? Visit this link:', 20, 250);
    pdf.setFontSize(9);
    pdf.text(guestUrl, 20, 258);
    
    // Add host notification reminder
    pdf.setFillColor(255, 245, 157); // Light yellow background
    pdf.rect(15, 265, 180, 15, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('📱 IMPORTANT FOR HOSTS:', 20, 272);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Add this link to your Airbnb/Booking.com automatic messages!', 20, 278);
    
    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Generated by MyHostIQ - AI-powered guest assistance', 105, 290, { align: 'center' });
    
    // Download
    pdf.save(`${apartmentName.replace(/[^a-zA-Z0-9]/g, '_')}_MyHostIQ_QR.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-600">
            <QrCode className="h-5 w-5 mr-2" />
            QR Code for {apartmentName}
          </CardTitle>
          <CardDescription>
            Guests scan this code for instant AI assistance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            {qrCodeUrl && (
              <div className="bg-white p-6 rounded-lg inline-block shadow-md border-2 border-blue-100">
                <img ref={qrRef} src={qrCodeUrl} alt="QR Code" className="w-56 h-56" />
              </div>
            )}
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800 mb-2 font-medium">Guest URL:</p>
            <p className="text-xs font-mono break-all bg-white p-3 rounded border">
              {guestUrl}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              onClick={downloadPDF} 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">
              Print and place this QR code prominently in your apartment
            </p>
            <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-800 font-medium mb-1">📋 Pro Tip:</p>
              <p className="text-xs text-amber-700">
                Add this guest link to your Airbnb/Booking.com automatic booking messages so guests know about their AI assistant before arrival!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Enhanced Login Component 
const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Welcome back</CardTitle>
            <CardDescription>Sign in to your MyHostIQ account</CardDescription>
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
              
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Forgot password?
                </button>
              </div>
              
              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            
            <div className="text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <button 
                onClick={() => navigate('/register')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Sign up
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <ForgotPassword 
        isOpen={showForgotPassword} 
        onClose={() => setShowForgotPassword(false)} 
      />
    </>
  );
};

// Enhanced Register Component with phone validation
const Register = () => {
  const [formData, setFormData] = useState({ email: "", full_name: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      await register(formData.email, formData.full_name, formData.password, formData.phone);
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Create account</CardTitle>
          <CardDescription>Join the future of hospitality with MyHostIQ</CardDescription>
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
              type="tel"
              placeholder="Phone number (optional)"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
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
              onClick={() => navigate('/login')}
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

// Enhanced Demo Chat Component
const DemoChat = () => {
  const [messages, setMessages] = useState([
    {
      type: 'ai',
      content: 'Hello! I\'m your MyHostIQ AI assistant. I can help with apartment rules, local recommendations, check-in instructions, and more. What would you like to know?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const demoResponses = {
    'rules': 'Here are your apartment rules: ✅ No smoking anywhere in the apartment ✅ Check-in after 2:00 PM, checkout by 11:00 AM ✅ Maximum 4 guests ✅ Keep noise level respectful after 10 PM ✅ Please take off shoes when entering',
    'restaurants': '🍕 **Local Restaurant Recommendations:** \n• **Trattoria Mario** (Italian) - Best authentic pasta, 5-min walk \n• **Café Central** (Coffee & Breakfast) - Perfect morning spot \n• **Bistro Luna** (Fine Dining) - Romantic dinners, book ahead \n• **Street Food Market** (Various) - Try local specialties, weekends only',
    'transport': '🚌 **Getting Around:** \n• **Bus Line 64** - Direct to city center (stop 2 min walk) \n• **Metro Station A** - 5 minutes walking, connects to main attractions \n• **Taxi Apps** - Uber, Bolt available 24/7 \n• **Bike Rental** - Station across the street \n• **Walking** - Historic center is 15 min walk',
    'checkin': '🔑 **Check-in Instructions:** \n• Arrival time: After 2:00 PM \n• **Key location:** Smart lockbox next to main entrance \n• **Access code:** Will be sent via SMS 2 hours before arrival \n• **WiFi:** Network: "Sunny_Apartment" / Password: "Welcome2024" \n• **Parking:** Free street parking, blue zone ends at 8 PM',
    'wifi': '📶 **WiFi Information:** \n• **Network Name:** "Sunny_Apartment_Guest" \n• **Password:** "Welcome2024!" \n• **Speed:** High-speed fiber (100 Mbps) perfect for work \n• **Coverage:** Full apartment + balcony \n• **Backup network:** "Sunny_Guest_2" / Password: "Backup123"',
    'emergency': '🚨 **Emergency & Important Contacts:** \n• **Host:** +1-555-0123 (24/7 for urgent issues) \n• **Emergency Services:** 112 \n• **Local Police:** +1-555-0911 \n• **Hospital:** City General (10 min drive) \n• **Building Manager:** +1-555-0456 \n• **Taxi:** +1-555-TAXI',
    'amenities': '🏠 **Apartment Amenities:** \n• **Kitchen:** Full equipped, dishwasher, coffee machine \n• **Laundry:** Washing machine + dryer in bathroom \n• **Heating/AC:** Central climate control \n• **TV:** Smart TV with Netflix, YouTube \n• **Work Space:** Desk with good lighting \n• **Extras:** Hair dryer, iron, first aid kit',
    'default': '💡 I can help with: \n• 🏠 Apartment rules and check-in \n• 🍽️ Restaurant recommendations \n• 🚌 Transport and getting around \n• 📶 WiFi and amenities \n• 🚨 Emergency contacts \n• 🎯 Local attractions and hidden gems \n\nWhat would you like to know about?'
  };

  const sendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage = { type: 'user', content: inputMessage, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    
    const question = inputMessage.toLowerCase();
    let response = demoResponses.default;
    
    if (question.includes('rule') || question.includes('smoking') || question.includes('noise')) {
      response = demoResponses.rules;
    } else if (question.includes('restaurant') || question.includes('food') || question.includes('eat') || question.includes('dining')) {
      response = demoResponses.restaurants;
    } else if (question.includes('transport') || question.includes('bus') || question.includes('metro') || question.includes('taxi')) {
      response = demoResponses.transport;
    } else if (question.includes('check') || question.includes('key') || question.includes('arrive') || question.includes('entry')) {
      response = demoResponses.checkin;
    } else if (question.includes('wifi') || question.includes('internet') || question.includes('password') || question.includes('network')) {
      response = demoResponses.wifi;
    } else if (question.includes('emergency') || question.includes('help') || question.includes('contact') || question.includes('phone')) {
      response = demoResponses.emergency;
    } else if (question.includes('amenity') || question.includes('facility') || question.includes('kitchen') || question.includes('tv')) {
      response = demoResponses.amenities;
    }

    setInputMessage("");
    setLoading(true);

    setTimeout(() => {
      const aiMessage = { type: 'ai', content: response, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, aiMessage]);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border h-[500px] flex flex-col">
      <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-xl">
        <div className="flex items-center space-x-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">MyHostIQ AI Assistant Demo</h3>
            <p className="text-blue-100 text-sm">Try asking about rules, restaurants, check-in, or WiFi!</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start space-x-2 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`p-1.5 rounded-full ${message.type === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {message.type === 'user' ? (
                  <User className="h-4 w-4 text-blue-600" />
                ) : (
                  <Bot className="h-4 w-4 text-gray-600" />
                )}
              </div>
              <div className={`p-3 rounded-xl text-sm ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : 'bg-gray-100 text-gray-900 rounded-bl-sm'
              }`}>
                <div className="whitespace-pre-line">{message.content}</div>
                <div className={`text-xs mt-2 ${message.type === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="p-1.5 rounded-full bg-gray-100">
                <Bot className="h-4 w-4 text-gray-600" />
              </div>
              <div className="bg-gray-100 p-3 rounded-xl rounded-bl-sm">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <div className="flex space-x-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask about apartment rules, local restaurants, check-in..."
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={loading}
          />
          <Button 
            onClick={sendMessage} 
            disabled={loading || !inputMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Try: "What are the apartment rules?" or "Recommend restaurants nearby"
        </p>
      </div>
    </div>
  );
};

// Payment Simulation Component - Same as before but rebranded
const PaymentSimulation = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [cardData, setCardData] = useState({
    number: "4242 4242 4242 4242",
    expiry: "12/25",
    cvc: "123",
    name: "John Smith"
  });

  const handlePayment = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-600">
            <CreditCard className="h-5 w-5 mr-2" />
            Payment Simulation
          </CardTitle>
          <CardDescription>Demo payment for €15/month subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 ? (
            <>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Card Number</label>
                  <Input value={cardData.number} onChange={(e) => setCardData(prev => ({...prev, number: e.target.value}))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Expiry</label>
                    <Input value={cardData.expiry} onChange={(e) => setCardData(prev => ({...prev, expiry: e.target.value}))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">CVC</label>
                    <Input value={cardData.cvc} onChange={(e) => setCardData(prev => ({...prev, cvc: e.target.value}))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Cardholder Name</label>
                  <Input value={cardData.name} onChange={(e) => setCardData(prev => ({...prev, name: e.target.value}))} />
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span>MyHostIQ Pro</span>
                  <span>€15.00</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Per apartment/month</span>
                  <span>First month free</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center font-semibold">
                  <span>Total</span>
                  <span>€0.00</span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                <Button onClick={handlePayment} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  {loading ? "Processing..." : "Start Free Trial"}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h3>
              <p className="text-gray-600">Welcome to MyHostIQ! Redirecting to dashboard...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Enhanced How It Works Steps Component
const HowItWorksSteps = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">How MyHostIQ Works</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transform your property into a smart hospitality experience in 4 simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Step 1 */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center h-full hover:shadow-xl transition-shadow">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserPlus className="h-8 w-8 text-blue-600" />
              </div>
              <div className="absolute -top-4 -right-4 bg-blue-600 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Create Account</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Sign up with your email and phone number. Start your free 30-day trial instantly - no credit card required.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center h-full hover:shadow-xl transition-shadow">
              <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="absolute -top-4 -right-4 bg-emerald-600 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Setup Your Property</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Add apartment details, rules, local recommendations, and connect your Airbnb/Booking.com calendar in minutes.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center h-full hover:shadow-xl transition-shadow">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <PaintBucket className="h-8 w-8 text-purple-600" />
              </div>
              <div className="absolute -top-4 -right-4 bg-purple-600 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Customize & Brand</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Personalize your AI assistant with custom colors, logo, and brand voice to match your property's style.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center h-full hover:shadow-xl transition-shadow">
              <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <QrCode className="h-8 w-8 text-orange-600" />
              </div>
              <div className="absolute -top-4 -right-4 bg-orange-600 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center">
                4
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Go Live</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Generate your QR code, add the link to booking messages, and watch your guest satisfaction soar!
              </p>
            </div>
          </div>
        </div>

        {/* Integration showcase */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Seamless Integration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Smartphone className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Instant Access</h4>
              <p className="text-sm text-gray-600">Guests scan QR code or click link - no app downloads, works on any device</p>
            </div>
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
              <h4 className="font-semibold mb-2">24/7 Smart Assistance</h4>
              <p className="text-sm text-gray-600">AI handles check-in, rules, recommendations, and emergency contacts automatically</p>
            </div>
            <div className="text-center">
              <BarChart className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h4 className="font-semibold mb-2">Analytics & Insights</h4>
              <p className="text-sm text-gray-600">Track guest interactions, popular questions, and optimize your hospitality experience</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Enhanced Landing Page with new branding and better hook
const LandingHome = () => {
  const [showDemo, setShowDemo] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const navigate = useNavigate();

  const handleStartTrial = () => {
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    navigate('/register');
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section with better hook */}
      <section className="relative bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/30"></div>
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            {/* Logo */}
            <div className="mb-8">
              <img 
                src="https://customer-assets.emergentagent.com/job_hostai/artifacts/h1aih2u5_image.png" 
                alt="MyHostIQ Logo" 
                className="h-20 mx-auto mb-4"
                onError={(e) => {
                  // Fallback to text if image fails to load
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'block';
                }}
              />
              <h1 
                className="text-7xl md:text-8xl font-bold mb-2 hidden"
                style={{ display: 'none' }}
              >
                My<span className="text-blue-400">Host</span>IQ
              </h1>
              <div className="w-24 h-1 bg-blue-400 mx-auto rounded-full"></div>
            </div>
            
            {/* New compelling hook */}
            <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
              Stop Answering the Same Guest Questions 
              <span className="block text-blue-300">Over and Over Again</span>
            </h2>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Your AI assistant handles <span className="text-blue-300 font-semibold">80% of guest questions</span> instantly - 
              from check-in instructions to restaurant recommendations. 
              <span className="block mt-2 text-lg">More happy guests, less stress for you.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button 
                onClick={handleStartTrial}
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 text-xl font-semibold shadow-2xl transform hover:scale-105 transition-all"
              >
                <Zap className="h-6 w-6 mr-3" />
                Start Free Trial - No Credit Card
              </Button>
              <Button 
                onClick={() => setShowDemo(true)}
                variant="outline" 
                size="lg" 
                className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-10 py-5 text-xl transform hover:scale-105 transition-all"
              >
                <PlayCircle className="h-6 w-6 mr-3" />
                See Live Demo
              </Button>
            </div>

            {/* Enhanced demo and payment modals remain the same */}
            {showDemo && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl max-w-2xl w-full">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold text-gray-900">MyHostIQ AI Demo</h2>
                      <Button variant="outline" onClick={() => setShowDemo(false)}>Close</Button>
                    </div>
                    <DemoChat />
                  </div>
                </div>
              </div>
            )}

            {showPayment && (
              <PaymentSimulation 
                onClose={() => setShowPayment(false)} 
                onSuccess={handlePaymentSuccess}
              />
            )}
          </div>

          {/* Enhanced stats with better metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 transform hover:scale-105 transition-all">
              <div className="text-4xl font-bold mb-2">80%</div>
              <div className="text-gray-300">Fewer Support Messages</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 transform hover:scale-105 transition-all">
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-gray-300">Always Available</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 transform hover:scale-105 transition-all">
              <div className="text-4xl font-bold mb-2">5min</div>
              <div className="text-gray-300">Setup Time</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 transform hover:scale-105 transition-all">
              <div className="text-4xl font-bold mb-2">€15</div>
              <div className="text-gray-300">Per Month</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Steps */}
      <HowItWorksSteps />

      {/* Features Section with enhanced messaging */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Hosts Love MyHostIQ</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Stop being a 24/7 customer service agent for your rental property</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
              <CardHeader className="text-center pb-4">
                <div className="bg-blue-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                  <Bot className="h-10 w-10 text-blue-600" />
                </div>
                <CardTitle className="text-xl mb-2">Never Miss a Question</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-left space-y-3 text-gray-600">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Instant responses 24/7</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Handles check-in, rules, WiFi passwords</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Local restaurant & transport tips</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Emergency contact information</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
              <CardHeader className="text-center pb-4">
                <div className="bg-emerald-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-200 transition-colors">
                  <BarChart3 className="h-10 w-10 text-emerald-600" />
                </div>
                <CardTitle className="text-xl mb-2">Know Your Guests Better</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-left space-y-3 text-gray-600">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Track most common questions</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Guest interaction analytics</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Improve your property based on data</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Spot potential issues early</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group">
              <CardHeader className="text-center pb-4">
                <div className="bg-purple-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                  <QrCode className="h-10 w-10 text-purple-600" />
                </div>
                <CardTitle className="text-xl mb-2">Zero Friction Setup</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-left space-y-3 text-gray-600">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />QR codes for instant access</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />No apps to download for guests</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Your brand colors and logo</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Syncs with Airbnb & Booking.com</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social proof and testimonials section would go here */}
      
      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Honest Pricing</h2>
          <p className="text-xl text-gray-600 mb-12">One price, everything included. Cancel anytime.</p>
          
          <Card className="max-w-lg mx-auto shadow-2xl border-2 border-blue-200 relative overflow-hidden transform hover:scale-105 transition-all">
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center py-3 text-sm font-semibold">
              🚀 MOST POPULAR - LIMITED TIME
            </div>
            <CardHeader className="pt-16 pb-6">
              <CardTitle className="text-3xl font-bold">MyHostIQ Pro</CardTitle>
              <CardDescription className="text-lg">Everything you need for superior guest experience</CardDescription>
              <div className="text-center my-6">
                <span className="text-6xl font-bold text-blue-600">€15</span>
                <span className="text-gray-600 text-lg">/apartment/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 text-left">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span><strong>Unlimited</strong> AI conversations</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span><strong>Custom QR codes</strong> & professional PDFs</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span><strong>Advanced analytics</strong> & guest insights</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span><strong>White-label branding</strong> (your colors & logo)</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span><strong>Airbnb & Booking.com</strong> calendar sync</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span><strong>Multi-language</strong> support (40+ languages)</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                  <span><strong>Priority support</strong> & onboarding</span>
                </div>
              </div>
              
              <div className="pt-6">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-xl py-4 transform hover:scale-105 transition-all shadow-lg"
                  onClick={handleStartTrial}
                >
                  Start 30-Day Free Trial
                </Button>
                <p className="text-sm text-gray-500 mt-3">✅ No credit card required • ✅ Cancel anytime • ✅ Full access during trial</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Stop Being a 24/7 Concierge?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join 1000+ hosts who've reduced guest messages by 80% with MyHostIQ
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={handleStartTrial}
              className="bg-white text-blue-600 hover:bg-gray-100 px-10 py-4 text-xl font-semibold transform hover:scale-105 transition-all shadow-2xl"
            >
              Start Free Trial
              <ArrowRight className="h-6 w-6 ml-3" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-10 py-4 text-xl"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

// Continue with remaining components...
// Due to length constraints, I'll continue with the other components in the next part.
// The remaining components (GuestChat, AnalyticsDashboard, HostDashboard, etc.) will follow the same rebranding pattern.

// For now, let me include the basic structure with updated branding:

// Continue with remaining components...

// Enhanced Guest Chat Component with AI tone selection and fallback logic
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
      
      // Add welcome message with MyHostIQ branding
      setMessages([{
        type: 'ai',
        content: `Welcome to ${response.data.apartment.name}! 🏠 I'm your personal ${response.data.branding.brand_name || 'MyHostIQ'} assistant. I can help you with check-in instructions, apartment rules, local recommendations, and emergency contacts. What would you like to know?`,
        timestamp: new Date().toISOString()
      }]);
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
        content: "I'm having trouble connecting right now. For urgent matters, please contact your host directly using the contact information provided in your booking confirmation. I'll be back online shortly!", 
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your MyHostIQ assistant...</p>
        </div>
      </div>
    );
  }

  const primaryColor = branding.brand_primary_color || BRAND_COLORS.primary;

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05)` }}>
      {/* Header with enhanced branding */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {branding.brand_logo_url ? (
                <img src={branding.brand_logo_url} alt="Logo" className="h-10 w-10 rounded" />
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
                <p className="text-sm text-gray-600">
                  AI Assistant
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Powered by</p>
              <p className="font-semibold text-blue-600">{branding.brand_name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-lg border h-[600px] flex flex-col">
          {/* Welcome Message with enhanced branding */}
          <div 
            className="p-6 border-b text-white rounded-t-xl"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${branding.brand_secondary_color || BRAND_COLORS.secondary})` }}
          >
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{branding.brand_name} AI Assistant</h2>
                <p className="text-white/90 text-sm">Your personal concierge for this stay</p>
              </div>
            </div>
          </div>

          {/* Messages with enhanced styling */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                    <div className="text-sm leading-relaxed whitespace-pre-line">{message.content}</div>
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

          {/* Enhanced input with suggestions */}
          <div className="border-t p-6 bg-gray-50">
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                {['Check-in instructions', 'WiFi password', 'Local restaurants', 'Emergency contacts'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputMessage(suggestion)}
                    className="text-xs px-3 py-1 bg-white border rounded-full hover:bg-gray-100 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex space-x-4">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about check-in, restaurants, rules, or anything else..."
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
            <p className="text-xs text-gray-500 mt-2 text-center">
              Need urgent help? Contact your host directly via your booking confirmation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Analytics Dashboard with AI response tracking
const AnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7days');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/dashboard?period=${selectedPeriod}`);
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No analytics data available yet</p>
          <p className="text-sm text-gray-500">
            Analytics will appear once guests start using your AI assistant
          </p>
        </CardContent>
      </Card>
    );
  }

  const { overview, apartments } = analyticsData;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 3 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{overview.total_apartments}</p>
                <p className="text-blue-100 text-sm">Active Properties</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{overview.total_chats}</p>
                <p className="text-emerald-100 text-sm">Total Conversations</p>
              </div>
              <MessageCircle className="h-8 w-8 text-emerald-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{Math.round(overview.avg_chats_per_apartment)}</p>
                <p className="text-purple-100 text-sm">Avg per Property</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{overview.active_apartments}</p>
                <p className="text-orange-100 text-sm">Properties with Activity</p>
              </div>
              <Activity className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Guest Satisfaction & Response Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="h-5 w-5 mr-2 text-yellow-500" />
              AI Response Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Successful responses</span>
                  <span className="text-sm font-medium">94%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '94%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Average response time</span>
                  <span className="text-sm font-medium">1.2s</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-500" />
              Peak Usage Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsData && analyticsData.apartments && analyticsData.apartments.length > 0 ? (
              <div className="space-y-3">
                {/* Show peak hours from first apartment or aggregate across all */}
                {analyticsData.apartments[0].peak_hours.slice(0, 3).map((period, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">{period.time}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{period.label}</span>
                        {period.count > 0 && <Badge variant="outline">{period.count} chats</Badge>}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${period.usage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No usage data yet</p>
                <p className="text-gray-400 text-xs">Analytics will appear once guests start chatting</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Apartment Details with Q&A Tracking */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Property Performance & Popular Q&A</h3>
        {apartments.map((apartment) => (
          <Card key={apartment.apartment_id} className="border-0 shadow-md">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{apartment.apartment_name}</CardTitle>
                  <CardDescription>
                    {apartment.total_chats} conversations • {apartment.total_sessions} unique sessions
                    {apartment.last_chat && (
                      <span> • Last activity: {new Date(apartment.last_chat).toLocaleDateString()}</span>
                    )}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Popular Q&A with AI responses */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Popular Questions & AI Responses
                  </h4>
                  {apartment.popular_questions && apartment.popular_questions.length > 0 ? (
                    <div className="space-y-3">
                      {apartment.popular_questions.slice(0, 3).map((qa, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <div className="mb-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-blue-600">Question:</span>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{qa.count} times</Badge>
                                {qa.percentage && <Badge variant="secondary">{qa.percentage}%</Badge>}
                              </div>
                            </div>
                            <p className="text-sm text-gray-800">{qa.question}</p>
                          </div>
                          {qa.latest_response && (
                            <div>
                              <span className="text-xs font-medium text-green-600">Latest AI Response:</span>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {qa.latest_response.substring(0, 150)}...
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No questions yet - encourage guests to use the AI assistant!</p>
                  )}
                </div>

                {/* Activity Timeline */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Recent Activity ({selectedPeriod})
                  </h4>
                  <div className="space-y-2">
                    {apartment.daily_chats && apartment.daily_chats.length > 0 ? (
                      apartment.daily_chats.map((day, index) => (
                        <div key={index} className="flex justify-between items-center py-2">
                          <span className="text-sm text-gray-600">
                            {new Date(day.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${Math.min(100, (day.chats / Math.max(...apartment.daily_chats.map(d => d.chats), 1)) * 100)}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-8 text-right">{day.chats}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No recent activity</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Insights & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2" />
            AI Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analyticsData && analyticsData.overview ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-indigo-200">
                  <h5 className="font-semibold text-indigo-800 mb-2">📊 Usage Statistics</h5>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• Total properties: {analyticsData.overview.total_apartments}</li>
                    <li>• Total conversations: {analyticsData.overview.total_chats}</li>
                    <li>• Active properties: {analyticsData.overview.active_apartments}</li>
                    <li>• Avg chats per property: {analyticsData.overview.avg_chats_per_apartment.toFixed(1)}</li>
                  </ul>
                </div>
                <div className="bg-white p-4 rounded-lg border border-indigo-200">
                  <h5 className="font-semibold text-indigo-800 mb-2">💡 Quick Tips</h5>
                  <ul className="text-sm space-y-1 text-gray-700">
                    {analyticsData.overview.total_chats === 0 ? (
                      <>
                        <li>• Share your AI assistant link with guests</li>
                        <li>• Add property details for better AI responses</li>
                        <li>• Enable iCal integration for automated notifications</li>
                      </>
                    ) : (
                      <>
                        <li>• Review popular questions to improve property info</li>
                        <li>• Monitor peak usage hours for guest patterns</li>
                        <li>• Update recommendations based on guest feedback</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Analytics loading...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Email Credentials Manager Component
const EmailCredentialsManager = () => {
  const [emailCreds, setEmailCreds] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    smtp_server: '',
    smtp_port: 587
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchEmailCredentials();
  }, []);

  const fetchEmailCredentials = async () => {
    try {
      const response = await axios.get(`${API}/auth/email-credentials`);
      setEmailCreds(response.data);
    } catch (error) {
      console.error('Error fetching email credentials:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const endpoint = emailCreds ? 'PUT' : 'POST';
      const response = await axios({
        method: endpoint,
        url: `${API}/auth/email-credentials`,
        data: formData
      });
      
      setEmailCreds(response.data);
      setShowForm(false);
      setFormData({ email: '', password: '', smtp_server: '', smtp_port: 587 });
      setMessage({ type: 'success', text: 'Email credentials saved successfully!' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to save email credentials' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      await axios.post(`${API}/auth/test-email`);
      setMessage({ type: 'success', text: 'Test email sent successfully! Check your inbox.' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to send test email' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your email credentials?')) return;
    
    setLoading(true);
    try {
      await axios.delete(`${API}/auth/email-credentials`);
      setEmailCreds(null);
      setMessage({ type: 'success', text: 'Email credentials deleted successfully' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to delete email credentials' 
      });
    } finally {
      setLoading(false);
    }
  };

  const detectSMTPSettings = (email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain?.includes('gmail.com')) {
      setFormData(prev => ({ ...prev, smtp_server: 'smtp.gmail.com', smtp_port: 587 }));
    } else if (domain?.includes('outlook.com') || domain?.includes('hotmail.com')) {
      setFormData(prev => ({ ...prev, smtp_server: 'smtp-mail.outlook.com', smtp_port: 587 }));
    } else if (domain?.includes('yahoo.com')) {
      setFormData(prev => ({ ...prev, smtp_server: 'smtp.mail.yahoo.com', smtp_port: 587 }));
    }
  };

  return (
    <div className="space-y-4">
      {message.text && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {emailCreds ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-900">Email Configured</p>
                  <p className="text-sm text-green-700">{emailCreds.email}</p>
                  <p className="text-xs text-green-600">
                    {emailCreds.smtp_server}:{emailCreds.smtp_port} • 
                    {emailCreds.is_verified ? ' ✅ Verified' : ' ❌ Not verified'}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" onClick={handleTest} disabled={loading}>
                  <Send className="h-4 w-4 mr-1" />
                  Test
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={handleDelete} disabled={loading}>
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 p-2 rounded-full mt-1">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-2">Email Notifications Active</h4>
                <p className="text-sm text-blue-700 mb-3">
                  When guests book your property through iCal integration, they'll receive beautiful welcome emails 
                  directly from your email address with their personalized AI assistant link.
                </p>
                <div className="text-xs text-blue-600 space-y-1">
                  <p>• Emails sent from: <strong>{emailCreds.email}</strong></p>
                  <p>• Automatic trigger on new bookings</p>
                  <p>• Branded email templates with your logo and colors</p>
                  <p>• Includes check-in instructions and local recommendations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Email Configuration</h3>
          <p className="text-gray-600 mb-4">
            Configure your email to automatically send welcome messages to guests from your own email address.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Email Credentials
          </Button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {emailCreds ? 'Update' : 'Add'} Email Credentials
              </CardTitle>
              <CardDescription>
                Configure your email to send guest notifications from your own email address
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, email: e.target.value }));
                      detectSMTPSettings(e.target.value);
                    }}
                    placeholder="your-email@gmail.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use your Gmail, Outlook, or business email
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Password / App Password *
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Your email password"
                    required
                  />
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                    <p className="text-xs text-amber-800 font-medium mb-1">🔒 Security Tip:</p>
                    <p className="text-xs text-amber-700">
                      For Gmail/Outlook, use an <strong>App Password</strong> instead of your main password. 
                      This is more secure and required for 2FA accounts.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Server
                    </label>
                    <Input
                      value={formData.smtp_server}
                      onChange={(e) => setFormData(prev => ({ ...prev, smtp_server: e.target.value }))}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Port
                    </label>
                    <Input
                      type="number"
                      value={formData.smtp_port}
                      onChange={(e) => setFormData(prev => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
                      placeholder="587"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Verifying...' : (emailCreds ? 'Update' : 'Save & Verify')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Enhanced Host Dashboard with edit capabilities and AI tone selection
const HostDashboard = () => {
  const { user, logout } = useAuth();
  const [apartments, setApartments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingApartment, setEditingApartment] = useState(null);
  const [showQRCode, setShowQRCode] = useState(null);
  const [activeTab, setActiveTab] = useState("apartments");
  const [whitelabelData, setWhitelabelData] = useState({
    brand_name: user?.brand_name || "MyHostIQ",
    brand_logo_url: user?.brand_logo_url || "",
    brand_primary_color: user?.brand_primary_color || BRAND_COLORS.primary,
    brand_secondary_color: user?.brand_secondary_color || BRAND_COLORS.secondary,
    ai_tone: user?.ai_tone || "professional", // New: AI tone setting
    custom_domain: user?.custom_domain || "",
    chat_background: user?.chat_background || "default",
    chat_font: user?.chat_font || "Inter"
  });
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    description: "",
    rules: [],
    contact: { phone: "", email: "", whatsapp: "" },
    ical_url: "",
    ai_tone: "professional",
    recommendations: {
      restaurants: [],
      hidden_gems: [],
      transport: ""
    }
  });
  const [newRule, setNewRule] = useState("");
  const [newRestaurant, setNewRestaurant] = useState({ name: "", type: "", tip: "" });
  const [newGem, setNewGem] = useState({ name: "", tip: "" });
  const [showiCalHelper, setShowiCalHelper] = useState(false);

  useEffect(() => {
    fetchApartments();
    if (user) {
      setWhitelabelData({
        brand_name: user.brand_name || "MyHostIQ",
        brand_logo_url: user.brand_logo_url || "",
        brand_primary_color: user.brand_primary_color || BRAND_COLORS.primary,
        brand_secondary_color: user.brand_secondary_color || BRAND_COLORS.secondary,
        ai_tone: user.ai_tone || "professional",
        custom_domain: user.custom_domain || "",
        chat_background: user.chat_background || "default",
        chat_font: user.chat_font || "Inter"
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

  const handleImportedData = (importedData) => {
    setFormData(prev => ({
      ...prev,
      name: importedData.name || prev.name,
      address: importedData.address || prev.address,
      description: importedData.description || prev.description,
      rules: importedData.rules || prev.rules,
      contact: {
        ...prev.contact,
        ...importedData.contact
      },
      recommendations: {
        ...prev.recommendations,
        ...importedData.recommendations
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingApartment) {
        // Update existing apartment
        await axios.put(`${API}/apartments/${editingApartment.id}`, formData);
      } else {
        // Create new apartment
        await axios.post(`${API}/apartments`, formData);
      }
      
      setFormData({
        name: "",
        address: "",
        description: "",
        rules: [],
        contact: { phone: "", email: "", whatsapp: "" },
        ical_url: "",
        ai_tone: "professional",
        recommendations: {
          restaurants: [],
          hidden_gems: [],
          transport: ""
        }
      });
      setShowForm(false);
      setEditingApartment(null);
      fetchApartments();
    } catch (error) {
      console.error("Error saving apartment:", error);
    }
  };

  const handleEditApartment = (apartment) => {
    setEditingApartment(apartment);
    setFormData({
      name: apartment.name,
      address: apartment.address,
      description: apartment.description,
      rules: apartment.rules || [],
      contact: apartment.contact || { phone: "", email: "", whatsapp: "" },
      ical_url: apartment.ical_url || "",
      ai_tone: apartment.ai_tone || "professional",
      recommendations: apartment.recommendations || {
        restaurants: [],
        hidden_gems: [],
        transport: ""
      }
    });
    setShowForm(true);
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

  const removeRule = (index) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
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

  const removeRestaurant = (index) => {
    setFormData(prev => ({
      ...prev,
      recommendations: {
        ...prev.recommendations,
        restaurants: prev.recommendations.restaurants.filter((_, i) => i !== index)
      }
    }));
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

  const removeGem = (index) => {
    setFormData(prev => ({
      ...prev,
      recommendations: {
        ...prev.recommendations,
        hidden_gems: prev.recommendations.hidden_gems.filter((_, i) => i !== index)
      }
    }));
  };

  const generateGuestLink = (apartmentId) => {
    return `${window.location.origin}/guest/${apartmentId}`;
  };

  const testIcalSync = async (apartmentId) => {
    try {
      await axios.post(`${API}/ical/test-sync/${apartmentId}`);
      alert("iCal sync test completed! Check your email/WhatsApp for test message.");
    } catch (error) {
      console.error("Error testing iCal sync:", error);
      alert("Error testing iCal sync");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Enhanced Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {whitelabelData.brand_name}
                </h1>
                <p className="text-gray-600 mt-1">Welcome back, {user?.full_name}</p>
                {whitelabelData.custom_domain && (
                  <p className="text-sm text-blue-600">Custom domain: {whitelabelData.custom_domain}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Property
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
        {/* Enhanced Onboarding Guide */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Target className="h-6 w-6 mr-2" />
              MyHostIQ Setup Guide
            </CardTitle>
            <CardDescription className="text-blue-700">
              Complete these steps to maximize your guest satisfaction
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center mb-3">
                  <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                    <span className="text-sm font-bold text-blue-600">1</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">Add Properties</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Create your properties with detailed information, rules, and local recommendations.
                </p>
                <div className="flex items-center text-xs text-blue-600">
                  <Building2 className="h-3 w-3 mr-1" />
                  Properties Tab
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center mb-3">
                  <div className="bg-purple-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                    <span className="text-sm font-bold text-purple-600">2</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">Customize Brand</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Set your colors, logo, AI tone, and chat appearance to match your brand.
                </p>
                <div className="flex items-center text-xs text-purple-600">
                  <Palette className="h-3 w-3 mr-1" />
                  Branding Tab
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center mb-3">
                  <div className="bg-emerald-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                    <span className="text-sm font-bold text-emerald-600">3</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">Setup iCal & Notifications</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Connect your booking calendars for automatic guest notifications via email & WhatsApp.
                </p>
                <div className="flex items-center text-xs text-emerald-600">
                  <Calendar className="h-3 w-3 mr-1" />
                  iCal Integration
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center mb-3">
                  <div className="bg-orange-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                    <span className="text-sm font-bold text-orange-600">4</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">Deploy & Monitor</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Generate QR codes, share guest links, and track performance in analytics.
                </p>
                <div className="flex items-center text-xs text-orange-600">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Analytics Tab
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white rounded-lg border-l-4 border-blue-400">
              <div className="flex items-start">
                <Sparkles className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                <div>
                  <h5 className="font-semibold text-gray-900 mb-1">Pro Tip</h5>
                  <p className="text-sm text-gray-700 mb-3">
                    The more detailed information you provide about your property and local area, 
                    the better your AI assistant can help your guests. Include WiFi passwords, 
                    check-in procedures, and your favorite local spots!
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-amber-50 rounded-lg border-l-4 border-amber-400">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3" />
                <div>
                  <h5 className="font-semibold text-gray-900 mb-1">Important: Guest Notification Strategy</h5>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Maximize your AI assistant usage with these steps:</strong>
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                    <li><strong>Airbnb/Booking.com:</strong> Add your guest link to automatic booking confirmation messages</li>
                    <li><strong>iCal Integration:</strong> Enable automatic WhatsApp & email notifications for new bookings</li>
                    <li><strong>QR Codes:</strong> Print and place prominently in your property</li>
                    <li><strong>Check-in Messages:</strong> Mention the AI assistant in your welcome instructions</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="apartments" className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>Properties</span>
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
            <TabsTrigger value="admin" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Admin</span>
            </TabsTrigger>
          </TabsList>

          {/* Enhanced Apartments Tab */}
          <TabsContent value="apartments">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apartments.map((apartment) => (
                <Card key={apartment.id} className="hover:shadow-lg transition-all border-0 shadow-md group">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{apartment.name}</CardTitle>
                        <CardDescription className="text-blue-100 flex items-center mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          {apartment.address}
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-white/20 border-white/30 text-white hover:bg-white hover:text-blue-600"
                        onClick={() => handleEditApartment(apartment)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{apartment.description}</p>
                    
                    {/* Enhanced status indicators */}
                    <div className="space-y-3 mb-4">
                      {apartment.ical_url && (
                        <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                          <div className="flex items-center text-emerald-700">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span className="text-xs font-medium">iCal Connected</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-xs h-6 px-2"
                            onClick={() => testIcalSync(apartment.id)}
                          >
                            Test
                          </Button>
                        </div>
                      )}
                      
                      {apartment.ai_tone && (
                        <div className="flex items-center text-blue-700 p-2 bg-blue-50 rounded-lg">
                          <Bot className="h-4 w-4 mr-2" />
                          <span className="text-xs font-medium capitalize">
                            AI Tone: {apartment.ai_tone}
                          </span>
                        </div>
                      )}
                      
                      {apartment.rules?.length > 0 && (
                        <div className="flex items-center text-orange-700 p-2 bg-orange-50 rounded-lg">
                          <Shield className="h-4 w-4 mr-2" />
                          <span className="text-xs font-medium">
                            {apartment.rules.length} Rules Set
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Performance Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600">{apartment.total_chats || 0}</p>
                        <p className="text-xs text-gray-600">AI Conversations</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-600">{apartment.total_sessions || 0}</p>
                        <p className="text-xs text-gray-600">Unique Guests</p>
                      </div>
                    </div>

                    <Separator className="my-4" />
                    
                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => navigator.clipboard.writeText(generateGuestLink(apartment.id))}
                          className="text-xs"
                        >
                          <LinkIcon className="h-3 w-3 mr-1" />
                          Copy Link
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => window.open(generateGuestLink(apartment.id), '_blank')}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      </div>
                      
                      <Button 
                        size="sm" 
                        onClick={() => setShowQRCode({
                          id: apartment.id, 
                          name: apartment.name,
                          brandName: whitelabelData.brand_name
                        })}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      >
                        <QrCode className="h-3 w-3 mr-1" />
                        Generate QR & PDF
                      </Button>
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

          {/* Enhanced Whitelabel Tab */}
          <TabsContent value="whitelabel">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Brand Identity</CardTitle>
                  <CardDescription>
                    Customize your brand appearance across all guest touchpoints
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand Name
                    </label>
                    <Input
                      value={whitelabelData.brand_name}
                      onChange={(e) => setWhitelabelData(prev => ({...prev, brand_name: e.target.value}))}
                      placeholder="MyHostIQ"
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Color
                      </label>
                      <div className="flex space-x-2">
                        <Input
                          type="color"
                          value={whitelabelData.brand_primary_color}
                          onChange={(e) => setWhitelabelData(prev => ({...prev, brand_primary_color: e.target.value}))}
                          className="w-12"
                        />
                        <Input
                          value={whitelabelData.brand_primary_color}
                          onChange={(e) => setWhitelabelData(prev => ({...prev, brand_primary_color: e.target.value}))}
                          placeholder="#2563eb"
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
                          className="w-12"
                        />
                        <Input
                          value={whitelabelData.brand_secondary_color}
                          onChange={(e) => setWhitelabelData(prev => ({...prev, brand_secondary_color: e.target.value}))}
                          placeholder="#1d4ed8"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Domain (optional)
                    </label>
                    <Input
                      value={whitelabelData.custom_domain}
                      onChange={(e) => setWhitelabelData(prev => ({...prev, custom_domain: e.target.value}))}
                      placeholder="ai.yourdomain.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Contact support to configure your custom domain
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chat Experience</CardTitle>
                  <CardDescription>
                    Customize how guests interact with your AI assistant
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chat Background Style
                    </label>
                    <Select 
                      value={whitelabelData.chat_background} 
                      onValueChange={(value) => setWhitelabelData(prev => ({...prev, chat_background: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Clean White</SelectItem>
                        <SelectItem value="gradient">Subtle Gradient</SelectItem>
                        <SelectItem value="branded">Brand Colors</SelectItem>
                        <SelectItem value="minimal">Minimal Gray</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chat Font Family
                    </label>
                    <Select 
                      value={whitelabelData.chat_font} 
                      onValueChange={(value) => setWhitelabelData(prev => ({...prev, chat_font: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter (Modern)</SelectItem>
                        <SelectItem value="Roboto">Roboto (Clean)</SelectItem>
                        <SelectItem value="Open Sans">Open Sans (Friendly)</SelectItem>
                        <SelectItem value="Poppins">Poppins (Rounded)</SelectItem>
                        <SelectItem value="Lato">Lato (Professional)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default AI Tone
                    </label>
                    <Select 
                      value={whitelabelData.ai_tone} 
                      onValueChange={(value) => setWhitelabelData(prev => ({...prev, ai_tone: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">
                          <div className="flex items-center">
                            <Briefcase className="h-4 w-4 mr-2" />
                            Professional - Formal and informative
                          </div>
                        </SelectItem>
                        <SelectItem value="friendly">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            Friendly - Warm and welcoming
                          </div>
                        </SelectItem>
                        <SelectItem value="casual">
                          <div className="flex items-center">
                            <Coffee className="h-4 w-4 mr-2" />
                            Casual - Relaxed and conversational
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      This can be overridden per property in the property settings
                    </p>
                  </div>

                  <Button onClick={updateWhitelabelSettings} className="w-full">
                    Update Brand Settings
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Preview Section */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>See how your branding will look to guests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
                  {/* Chat Header Preview */}
                  <div 
                    className="p-4 rounded-lg text-white"
                    style={{ 
                      background: `linear-gradient(135deg, ${whitelabelData.brand_primary_color}, ${whitelabelData.brand_secondary_color})`,
                      fontFamily: whitelabelData.chat_font 
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
                        <p className="text-white/90 text-sm">Your personal concierge</p>
                      </div>
                    </div>
                  </div>

                  {/* Sample Messages */}
                  <div className="space-y-3" style={{ fontFamily: whitelabelData.chat_font }}>
                    <div className="flex justify-start">
                      <div className="bg-white p-3 rounded-lg rounded-bl-sm max-w-xs">
                        <p className="text-sm">Welcome! I'm your {whitelabelData.ai_tone} AI assistant. How can I help you today?</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div 
                        className="p-3 rounded-lg rounded-br-sm max-w-xs text-white"
                        style={{ backgroundColor: whitelabelData.brand_primary_color }}
                      >
                        <p className="text-sm">What's the WiFi password?</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Settings Tab */}
          <TabsContent value="settings">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Manage your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <Input value={user?.email} disabled />
                    <p className="text-xs text-gray-500 mt-1">
                      {user?.email_verified ? "✅ Verified" : "❌ Not verified - Check your email"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <Input value={user?.full_name} disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <Input value={user?.phone || "Not provided"} disabled />
                    <p className="text-xs text-gray-500 mt-1">
                      {user?.phone_verified ? "✅ Verified" : "❌ Not verified"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Email Configuration</CardTitle>
                  <CardDescription>Configure your email for sending guest notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <EmailCredentialsManager />
                </CardContent>
              </Card>
            </div>

            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure how you receive updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Guest Message Alerts</p>
                      <p className="text-sm text-gray-500">Get notified when guests use your AI assistant</p>
                    </div>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">New Booking Notifications</p>
                      <p className="text-sm text-gray-500">Automatic alerts from iCal integration</p>
                    </div>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly Analytics Summary</p>
                      <p className="text-sm text-gray-500">Performance reports via email</p>
                    </div>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-red-600">Danger Zone</CardTitle>
                <CardDescription>Irreversible account actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 border border-red-200 rounded-lg">
                  <div>
                    <p className="font-medium">Delete Account</p>
                    <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
                <div className="pt-4">
                  <Button variant="outline" onClick={logout} className="w-full">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* QR Code Modal */}
        {showQRCode && (
          <QRCodeGenerator
            apartmentId={showQRCode.id}
            apartmentName={showQRCode.name}
            brandName={showQRCode.brandName}
            onClose={() => setShowQRCode(null)}
          />
        )}

        {/* Enhanced Add/Edit Apartment Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {editingApartment ? `Edit ${editingApartment.name}` : "Add New Property"}
                </h2>
                
                <PropertyLinkImporter onDataImported={handleImportedData} />
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Building2 className="h-5 w-5 mr-2" />
                      Property Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        placeholder="Property Name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                        required
                      />
                      
                      <AddressAutocomplete
                        placeholder="Full Address"
                        value={formData.address}
                        onChange={(value) => setFormData(prev => ({...prev, address: value}))}
                      />
                    </div>
                    
                    <Textarea
                      placeholder="Property Description (Be detailed - this helps your AI assistant provide better responses)"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                      required
                      rows={3}
                    />
                  </div>

                  {/* AI Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Bot className="h-5 w-5 mr-2" />
                      AI Assistant Configuration
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        AI Personality & Tone
                      </label>
                      <Select 
                        value={formData.ai_tone} 
                        onValueChange={(value) => setFormData(prev => ({...prev, ai_tone: value}))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">
                            <div className="flex items-center">
                              <Briefcase className="h-4 w-4 mr-2" />
                              Professional - Formal, informative, business-like
                            </div>
                          </SelectItem>
                          <SelectItem value="friendly">
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              Friendly - Warm, welcoming, personal
                            </div>
                          </SelectItem>
                          <SelectItem value="casual">
                            <div className="flex items-center">
                              <Coffee className="h-4 w-4 mr-2" />
                              Casual - Relaxed, conversational, laid-back
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        This affects how your AI assistant communicates with guests
                      </p>
                    </div>
                  </div>

                  {/* Contact & Notifications */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Phone className="h-5 w-5 mr-2" />
                      Contact & Emergency Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <Input
                          placeholder="host@example.com"
                          type="email"
                          value={formData.contact.email}
                          onChange={(e) => setFormData(prev => ({
                            ...prev, 
                            contact: {...prev.contact, email: e.target.value}
                          }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <Input
                          placeholder="+1 555 123 4567"
                          value={formData.contact.phone}
                          onChange={(e) => setFormData(prev => ({
                            ...prev, 
                            contact: {...prev.contact, phone: e.target.value}
                          }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (for notifications)</label>
                        <Input
                          placeholder="+1 555 123 4567"
                          value={formData.contact.whatsapp}
                          onChange={(e) => setFormData(prev => ({
                            ...prev, 
                            contact: {...prev.contact, whatsapp: e.target.value}
                          }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* iCal Integration */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Booking Calendar Integration
                    </h3>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          iCal URL (from Airbnb, Booking.com, etc.)
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowiCalHelper(!showiCalHelper)}
                          className="text-xs"
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          {showiCalHelper ? 'Hide' : 'Show'} Guide
                        </Button>
                      </div>
                      
                      <Input
                        placeholder="https://airbnb.com/calendar/ical/..."
                        value={formData.ical_url}
                        onChange={(e) => setFormData(prev => ({...prev, ical_url: e.target.value}))}
                      />
                      
                      {showiCalHelper && (
                        <div className="mt-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                          <h4 className="text-sm font-bold text-amber-900 mb-3 flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            📋 How to Find Your iCal URL
                          </h4>
                          
                          <div className="space-y-4 text-xs text-amber-800">
                            {/* Airbnb Instructions */}
                            <div className="bg-white/70 p-3 rounded-lg">
                              <h5 className="font-bold text-red-700 mb-2">🏠 Airbnb:</h5>
                              <ol className="list-decimal list-inside space-y-1 text-amber-900">
                                <li>Go to your <strong>Airbnb Host Dashboard</strong></li>
                                <li>Click on <strong>"Calendar"</strong> in the menu</li>
                                <li>Select your listing</li>
                                <li>Click <strong>"Availability settings"</strong></li>
                                <li>Scroll to <strong>"Calendar sync"</strong></li>
                                <li>Click <strong>"Export calendar"</strong></li>
                                <li>Copy the <strong>"Calendar address (URL)"</strong></li>
                              </ol>
                            </div>
                            
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
                            <strong>{rest.name}</strong> ({rest.type}) - {rest.tip}
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
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Place or attraction name"
                        value={newGem.name}
                        onChange={(e) => setNewGem(prev => ({...prev, name: e.target.value}))}
                      />
                      <Input
                        placeholder="Why is it special? Your personal tip"
                        value={newGem.tip}
                        onChange={(e) => setNewGem(prev => ({...prev, tip: e.target.value}))}
                      />
                      <Button type="button" onClick={addGem}>Add</Button>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {formData.recommendations.hidden_gems.map((gem, index) => (
                        <div key={index} className="bg-blue-50 p-3 rounded-lg text-sm flex justify-between items-start">
                          <div>
                            <strong>{gem.name}</strong> - {gem.tip}
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
                        setFormData({
                          name: "",
                          address: "",
                          description: "",
                          rules: [],
                          contact: { phone: "", email: "", whatsapp: "" },
                          ical_url: "",
                          ai_tone: "professional",
                          recommendations: {
                            restaurants: [],
                            hidden_gems: [],
                            transport: ""
                          }
                        });
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

const GuestChatWrapper = () => {
  const apartmentId = window.location.pathname.split('/guest/')[1];
  return <GuestChat apartmentId={apartmentId} />;
};

export default App;