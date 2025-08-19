import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { MessageCircle, Building2, MapPin, Phone, Mail, Plus, Send, Bot, User } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Guest Chat Component
const GuestChat = ({ apartmentId }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [apartmentInfo, setApartmentInfo] = useState(null);

  useEffect(() => {
    fetchApartmentInfo();
    fetchChatHistory();
  }, [apartmentId]);

  const fetchApartmentInfo = async () => {
    try {
      const response = await axios.get(`${API}/apartments/${apartmentId}`);
      setApartmentInfo(response.data);
    } catch (error) {
      console.error("Error fetching apartment info:", error);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get(`${API}/apartments/${apartmentId}/chat-history`);
      const history = response.data.reverse(); // Show oldest first
      setMessages(history.map(msg => ([
        { type: 'user', content: msg.message, timestamp: msg.timestamp },
        { type: 'ai', content: msg.response, timestamp: msg.timestamp }
      ])).flat());
    } catch (error) {
      console.error("Error fetching chat history:", error);
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
        message: inputMessage
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

  if (!apartmentInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading apartment information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Building2 className="h-6 w-6 text-indigo-600" />
            </div>
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
          <div className="p-6 border-b bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-t-xl">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Your AI Concierge</h2>
                <p className="text-indigo-100 text-sm">Ask me anything about your stay, local recommendations, or apartment details!</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Welcome to your AI assistant!</p>
                <p className="text-sm">Start by asking about check-in, local restaurants, or anything about {apartmentInfo.name}</p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`p-2 rounded-full ${message.type === 'user' ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                    {message.type === 'user' ? (
                      <User className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <Bot className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div className={`p-4 rounded-2xl ${
                    message.type === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-sm' 
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className={`text-xs mt-2 ${message.type === 'user' ? 'text-indigo-200' : 'text-gray-500'}`}>
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
                className="bg-indigo-600 hover:bg-indigo-700"
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

// Host Dashboard Component
const HostDashboard = () => {
  const [apartments, setApartments] = useState([]);
  const [showForm, setShowForm] = useState(false);
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
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Host IQ</h1>
              <p className="text-gray-600 mt-1">Manage your AI-powered apartment concierge</p>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Apartment
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Apartments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apartments.map((apartment) => (
            <Card key={apartment.id} className="hover:shadow-lg transition-shadow border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-t-lg">
                <CardTitle className="text-lg">{apartment.name}</CardTitle>
                <CardDescription className="text-emerald-100 flex items-center">
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

                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Guest Link:</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-xs break-all">
                    {generateGuestLink(apartment.id)}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => navigator.clipboard.writeText(generateGuestLink(apartment.id))}
                    className="w-full"
                  >
                    Copy Guest Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

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
                    <h3 className="text-lg font-semibold text-gray-800">Contact Information</h3>
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
                    <h3 className="text-lg font-semibold text-gray-800">Apartment Rules</h3>
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
                    <h3 className="text-lg font-semibold text-gray-800">Restaurant Recommendations</h3>
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
                    <h3 className="text-lg font-semibold text-gray-800">Hidden Gems</h3>
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
                    <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
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

// Home Landing Page
const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
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
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => window.location.href = '/host'} 
              size="lg" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 text-lg"
            >
              Start as Host
            </Button>
            <Button 
              onClick={() => window.location.href = '/guest/demo'} 
              variant="outline" 
              size="lg" 
              className="px-8 py-4 text-lg"
            >
              Try Demo Chat
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
              <MessageCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="mb-4">Instant Guest Support</CardTitle>
            <CardDescription>
              Reduce support requests by 80%. Your AI assistant handles common questions automatically, available 24/7 for your guests.
            </CardDescription>
          </Card>

          <Card className="text-center p-8 border-0 shadow-lg hover:shadow-xl transition-shadow">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="mb-4">Personalized Experience</CardTitle>
            <CardDescription>
              Each apartment gets a custom AI trained on your specific rules, recommendations, and local knowledge. No generic responses.
            </CardDescription>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Main App
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/host" element={<HostDashboard />} />
          <Route path="/guest/:apartmentId" element={
            <GuestChatWrapper />
          } />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

// Wrapper component to extract apartmentId from URL
const GuestChatWrapper = () => {
  const apartmentId = window.location.pathname.split('/guest/')[1];
  return <GuestChat apartmentId={apartmentId} />;
};

export default App;