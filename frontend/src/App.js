import { useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaCloudSun,
  FaExclamationTriangle,
  FaLeaf,
  FaSpinner,
  FaUserCircle,
} from "react-icons/fa";
import backgroundImage from "./background.jpeg";
import './index.css';

function App() {
  // Plant Disease Prediction states
  const [selectedFile, setSelectedFile] = useState(null);
  const [prediction, setPrediction] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [loadingPredict, setLoadingPredict] = useState(false);
  const [errorPredict, setErrorPredict] = useState("");

  // Weather states
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [errorWeather, setErrorWeather] = useState("");

  // Auth states
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
const [showSignup, setShowSignup] = useState(false);

const handleLoginClick = () => {
  clearAuthMessages();
  setShowLogin(true);
  setShowSignup(false);
};

const handleSignupClick = () => {
  clearAuthMessages();
  setShowSignup(true);
  setShowLogin(false);
};

const handleNavbarLogout = async () => {
  await handleLogout(); // your existing logout handler
  setShowLogin(false);
  setShowSignup(false);
};

  // Chatbot states
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]); // {text, user: true|false}
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  // Helper to clear auth messages
  const clearAuthMessages = () => {
    setAuthError("");
    setAuthMessage("");
  };

  // Auth handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    clearAuthMessages();
    setAuthLoading(true);

    const url = isLoginMode
      ? "http://127.0.0.1:5000/login"
      : "http://127.0.0.1:5000/signup";

    let body;
    if (isLoginMode) {
      if (!usernameOrEmail || !password) {
        setAuthError("Please enter username/email and password.");
        setAuthLoading(false);
        return;
      }
      body = { username_or_email: usernameOrEmail, password };
    } else {
      if (!username || !email || !password) {
        setAuthError("Please fill out username, email and password.");
        setAuthLoading(false);
        return;
      }
      body = { username, email, password };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error || "An error occurred");
      } else {
        if (isLoginMode) {
          setUser(data.user);
          setAuthMessage("Logged in successfully!");
          // Clear auth fields
          setUsernameOrEmail("");
          setPassword("");
        } else {
          setAuthMessage("Registered successfully! You can now log in.");
          setIsLoginMode(true);
          setUsername("");
          setEmail("");
          setPassword("");
        }
      }
    } catch (err) {
      setAuthError("Network error: " + err.message);
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    clearAuthMessages();
    try {
      const response = await fetch("http://127.0.0.1:5000/logout", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        setUser(null);
        setAuthMessage("Logged out successfully.");
      } else {
        setAuthError("Logout failed.");
      }
    } catch (err) {
      setAuthError("Network error: " + err.message);
    }
  };

  // Fetch profile on mount to maintain login between refreshes
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch("http://127.0.0.1:5000/profile", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch {
        // Fail silently
      }
    }
    fetchProfile();
  }, []);

  // Your existing handlers for disease prediction and weather fetching remain unchanged
  // (Copied as-is from your existing code)

  // Handlers for plant disease prediction
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setPrediction("");
    setConfidence(null);
    setErrorPredict("");
  };

  const handlePredictSubmit = async () => {
    if (!selectedFile) {
      setErrorPredict("Please select an image file first.");
      return;
    }
    setLoadingPredict(true);
    setErrorPredict("");
    setPrediction("");
    setConfidence(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Prediction API error");
      }
      const data = await response.json();
      if (data.error) {
        setErrorPredict(data.error);
      } else {
        setPrediction(data.prediction);
        setConfidence(data.confidence);
      }
    } catch (err) {
      setErrorPredict("Error: " + err.message);
    }
    setLoadingPredict(false);
  };

  // Handlers for weather fetching
  const handleCityChange = (e) => {
    setCity(e.target.value);
    setWeather(null);
    setErrorWeather("");
  };

  const handleFetchWeather = async () => {
    if (!city) {
      setErrorWeather("Please enter a city name.");
      return;
    }
    setLoadingWeather(true);
    setErrorWeather("");
    setWeather(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/weather?city=${city}`
      );
      if (!response.ok) {
        const data = await response.json();
        setErrorWeather(data.error || "Error fetching weather data");
        setLoadingWeather(false);
        return;
      }
      const data = await response.json();
      setWeather(data);
    } catch (err) {
      setErrorWeather("Network error: " + err.message);
    }
    setLoadingWeather(false);
  };

  // Chatbot send message handler
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    setChatError("");
    setChatMessages((prev) => [...prev, { text: chatInput, user: true }]);
    setChatLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:5000/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatInput }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages((prev) => [...prev, { text: data.reply, user: false }]);
      } else {
        setChatError(data.error || "Chatbot error");
      }
    } catch (err) {
      setChatError("Network error: " + err.message);
    }
    setChatInput("");
    setChatLoading(false);
  };

  // Send chat message on Enter key pressed
  const handleChatKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendChatMessage();
    }
  };

  // Styling (reuse your existing styles and add auth styles)
  const styles = {

    
   appContainer: {
  minHeight: "100vh",
  backgroundImage: `url(${backgroundImage})`,   // ⬅️ use your image
  backgroundSize: "cover",
  backgroundPosition: "center",
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  color: "#fff",
  padding: 40,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 50,
},
    title: {
      fontSize: "3rem",
      fontWeight: "bold",
      textShadow: "0 0 10px rgba(0,0,0,0.5)",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    authContainer: {
      background: "rgba(255, 255, 255, 0.15)",
      backdropFilter: "blur(12px)",
      borderRadius: 20,
      boxShadow: "0 8px 32px 0 rgba(0,0,0,0.37)",
      padding: 30,
      width: 420,
      color: "#003300",
      fontWeight: 600,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 15,
      userSelect: "none",
    },
    container: {
      display: "flex",
      flexWrap: "wrap",
      gap: 50,
      justifyContent: "center",
      width: "100%",
      maxWidth: 960,
    },
    section: {
      background: "rgba(255, 255, 255, 0.15)",
      backdropFilter: "blur(12px)",
      borderRadius: 20,
      boxShadow: "0 8px 32px 0 rgba(0,0,0,0.37)",
      padding: 30,
      width: 420,
      color: "#003300",
      fontWeight: 600,
      transition: "transform 0.3s ease",
      position: "relative",
      userSelect: "none",
    },
    heading: {
      marginBottom: 20,
      fontSize: "1.8rem",
      borderBottom: "3px solid #00ff88",
      paddingBottom: 8,
      fontWeight: "700",
      userSelect: "none",
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    inputText: {
      width: "100%",
      padding: 12,
      borderRadius: 10,
      border: "none",
      fontWeight: 600,
      fontSize: 16,
      boxShadow: "inset 0 0 8px rgba(0, 255, 136, 0.7)",
      marginBottom: 18,
      color: "#003300",
    },
    button: {
      width: "100%",
      padding: 14,
      borderRadius: 14,
      fontWeight: "700",
      fontSize: 18,
      border: "none",
      cursor: "pointer",
      backgroundColor: "#00cc77",
      color: "#fff",
      boxShadow: "0 0 12px #00ff88",
      transition: "background-color 0.3s ease",
      userSelect: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    buttonDisabled: {
      backgroundColor: "#004d33",
      cursor: "default",
      boxShadow: "none",
    },
    errorMessage: {
      marginTop: 18,
      backgroundColor: "rgba(255, 0, 0, 0.75)",
      padding: 14,
      borderRadius: 12,
      fontWeight: "700",
      fontSize: 16,
      textAlign: "center",
      boxShadow: "0 0 12px rgba(255, 0, 0, 0.75)",
      userSelect: "none",
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    successMessage: {
      marginTop: 18,
      backgroundColor: "rgba(0, 255, 136, 0.75)",
      padding: 14,
      borderRadius: 12,
      fontWeight: "700",
      fontSize: 16,
      textAlign: "center",
      boxShadow: "0 0 12px rgba(0, 255, 136, 0.75)",
      userSelect: "none",
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    profileContainer: {
      textAlign: "center",
      width: "420px",
      background: "rgba(255, 255, 255, 0.15)",
      backdropFilter: "blur(12px)",
      borderRadius: 20,
      boxShadow: "0 8px 32px 0 rgba(0,0,0,0.37)",
      padding: 30,
      userSelect: "none",
    },
  };

  return (
    <>
      <style>
        {`
          input[type="file"]::-webkit-file-upload-button {
            cursor: pointer;
            background-color: #00aa66;
            
            color: #fff;
            border: none;
            border-radius: 10px;
            padding: 8px 15px;
            font-weight: 700;
            transition: background-color 0.3s ease;
          }
          input[type="file"]::-webkit-file-upload-button:hover {
            background-color: #97edc6ff;
          }
          button:hover:not(:disabled) {
            background-color: #dfede7ff;
          }
          .spin {
            animation: spin 1.5s linear infinite;
            margin-right: 8px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg);}
            100% { transform: rotate(360deg);}
          }
        `}
      </style>

      <div style={styles.appContainer}>
        <h1 style={styles.title}>
          {/* <FaLeaf color="#e2e6e4ff" size={38} />/ */}
          
          {/* AGRINOVA- smart farming */}
        </h1>
        <br></br>

        {!user ? (
          <form onSubmit={handleAuthSubmit} style={styles.authContainer}>
            <div style={{ display: "flex", marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => {
                  clearAuthMessages();
                  setIsLoginMode(true);
                }}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: "14px 0 0 14px",
                  fontWeight: "700",
                  fontSize: 18,
                  cursor: "pointer",
                  border: "none",
                  backgroundColor: isLoginMode ? "#00cc77" : "#004d33",
                  color: isLoginMode ? "#fff" : "#ccc",
                  userSelect: "none",
                }}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAuthMessages();
                  setIsLoginMode(false);
                }}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: "0 14px 14px 0",
                  fontWeight: "700",
                  fontSize: 18,
                  cursor: "pointer",
                  border: "none",
                  backgroundColor: !isLoginMode ? "#00cc77" : "#004d33",
                  color: !isLoginMode ? "#fff" : "#ccc",
                  userSelect: "none",
                }}
              >
                Sign Up
              </button>
            </div>

            {isLoginMode ? (
              <>
                <input
                  type="text"
                  placeholder="Username or Email"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  style={styles.inputText}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.inputText}
                />
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={styles.inputText}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.inputText}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.inputText}
                />
              </>
            )}

            <button
              type="submit"
              disabled={authLoading}
              style={{
                ...styles.button,
                ...(authLoading ? styles.buttonDisabled : {}),
              }}
            >
              {authLoading ? <FaSpinner className="spin" /> : <FaCheckCircle />}
              {authLoading
                ? isLoginMode
                  ? "Logging in..."
                  : "Signing up..."
                : isLoginMode
                ? "Login"
                : "Sign Up"}
            </button>

            {authError && (
              <p style={styles.errorMessage}>
                <FaExclamationTriangle /> {authError}
              </p>
            )}
            {authMessage && (
              <p style={styles.successMessage}>
                <FaCheckCircle /> {authMessage}
              </p>
            )}
          </form>
        ) : (
          <>
            <div style={styles.profileContainer}>
              <h2>
                <FaUserCircle
                  color="#007a33"
                  size={28}
                  style={{ marginRight: 10 }}
                />
                Welcome, {user.username}!
              </h2>
              <button onClick={handleLogout} style={styles.button}>
                Log Out
              </button>
              {authMessage && (
                <p style={styles.successMessage}>
                  <FaCheckCircle /> {authMessage}
                </p>
              )}
              {authError && (
                <p style={styles.errorMessage}>
                  <FaExclamationTriangle /> {authError}
                </p>
              )}
            </div>

            <div style={styles.container}>
              {/* Plant Disease Prediction */}
              <section style={styles.section}>
                <h2 style={styles.heading}>
                  <FaLeaf color="#007a33" size={26} />
                  Plant Disease Prediction
                </h2>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={styles.inputFile}
                  title="Choose an image of a plant leaf"
                />
                <button
                  onClick={handlePredictSubmit}
                  disabled={loadingPredict}
                  style={{
                    ...styles.button,
                    ...(loadingPredict ? styles.buttonDisabled : {}),
                  }}
                >
                  {loadingPredict ? (
                    <FaSpinner className="spin" />
                  ) : (
                    <FaCheckCircle />
                  )}
                  {loadingPredict ? "Analyzing..." : "Predict Disease"}
                </button>
                {errorPredict && (
                  <p style={styles.errorMessage}>
                    <FaExclamationTriangle /> {errorPredict}
                  </p>
                )}
                {prediction && (
                  <div style={styles.resultBox}>
                    <h3 style={styles.predictionText}>{prediction}</h3>
                    <p style={styles.confidenceText}>
                      Confidence: {(confidence * 100).toFixed(2)}%
                    </p>
                  </div>
                )}
              </section>

              {/* Weather Forecast */}
              <section style={styles.section}>
                <h2 style={styles.heading}>
                  <FaCloudSun color="#007a33" size={26} />
                  Weather Forecast
                </h2>
                <input
                  type="text"
                  placeholder="Enter city name"
                  value={city}
                  onChange={handleCityChange}
                  style={styles.inputText}
                  title="Enter city name for weather forecast"
                />
                <button
                  onClick={handleFetchWeather}
                  disabled={loadingWeather}
                  style={{
                    ...styles.button,
                    ...(loadingWeather ? styles.buttonDisabled : {}),
                  }}
                >
                  {loadingWeather ? (
                    <FaSpinner className="spin" />
                  ) : (
                    <FaCheckCircle />
                  )}
                  {loadingWeather ? "Loading..." : "Get Weather"}
                </button>
                {errorWeather && (
                  <p style={styles.errorMessage}>
                    <FaExclamationTriangle /> {errorWeather}
                  </p>
                )}
                {weather && (
                  <div style={styles.resultBox}>
                    <h3 style={{ ...styles.predictionText, color: "#004466" }}>
                      {weather.city}
                    </h3>
                    <p style={{ fontSize: 20, marginBottom: 6 }}>
                      Temperature: {weather.temperature}°C
                    </p>
                    <p
                      style={{
                        fontSize: 18,
                        marginBottom: 8,
                        fontStyle: "italic",
                      }}
                    >
                      {weather.description.charAt(0).toUpperCase() +
                        weather.description.slice(1)}
                    </p>
                    <p style={{ fontSize: 18 }}>
                      Humidity: {weather.humidity}%
                    </p>
                    <p style={{ fontSize: 18 }}>
                      Wind Speed: {weather.wind_speed} m/s
                    </p>
                  </div>
                )}
              </section>

              <section style={styles.section}>
                <h2 style={styles.heading}>
                  <FaUserCircle color="#007a33" size={26} />
                  AGRINOVA Chatbot
                </h2>

                <div
                  style={{
                    height: 220,
                    overflowY: "auto",
                    marginBottom: 12,
                    padding: 12,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.2)",
                    color: "#003300",
                    fontWeight: 500,
                  }}
                >
                  {chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      style={{
                        textAlign: msg.user ? "right" : "left",
                        margin: "6px 0",
                      }}
                    >
                      <span
                        style={{
                          background: msg.user ? "#00cc77" : "#fff",
                          color: msg.user ? "#fff" : "#003300",
                          padding: "8px 12px",
                          borderRadius: 12,
                          display: "inline-block",
                          maxWidth: "80%",
                        }}
                      >
                        {msg.text}
                      </span>
                    </div>
                  ))}
                  {chatLoading && (
                    <p style={{ fontStyle: "italic" }}>Thinking...</p>
                  )}
                  {chatError && (
                    <p style={styles.errorMessage}>
                      <FaExclamationTriangle /> {chatError}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    style={{ ...styles.inputText, marginBottom: 0, flex: 1 }}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={chatLoading}
                    style={{ ...styles.button, width: 120 }}
                  >
                    {chatLoading ? (
                      <FaSpinner className="spin" />
                    ) : (
                      <FaCheckCircle />
                    )}
                    Send
                  </button>
                </div>
              </section>
            </div>
          </>
        )}

        <footer style={styles.footer}>
          &copy; 2025 AGRINOVA &mdash; Weather data provided by{" "}
          <a
            href="https://openweathermap.org"
            target="_blank"
            rel="noreferrer"
            style={styles.footerLink}
          >
            OpenWeather
          </a>
        </footer>
      </div>
    </>
  );
}

export default App;
