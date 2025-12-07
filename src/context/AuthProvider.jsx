import {useEffect, useState} from "react";
import {AuthContext} from "./AuthContext.js";

export function AuthProvider({children}) {
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [username, setUsername] = useState(() => {
        const userStr = localStorage.getItem("user");
        return userStr ? JSON.parse(userStr).username : null;
    });
    const [userId, setUserId] = useState(() => {
        const userStr = localStorage.getItem("user");
        return userStr ? JSON.parse(userStr).user_id : null;
    });

    useEffect(() => {
        if (token) {
            localStorage.setItem("token", token);
        } else {
            localStorage.removeItem("token");
        }
    }, [token]);

    useEffect(() => {
        if (username && userId) {
            localStorage.setItem("user", JSON.stringify({username, user_id: userId}));
        } else {
            localStorage.removeItem("user");
        }
    }, [username, userId]);


    const login = ({token: newToken, username: newUsername, userId: newUserId}) => {
        setToken(newToken);
        setUsername(newUsername);
        setUserId(newUserId);
    }
    const logout = () => {
        setToken(null);
        setUsername(null);
        setUserId(null);
    }

    return (
        <AuthContext.Provider value={{token, username, userId, login, logout}}>
            {children}
        </AuthContext.Provider>
    );
}
