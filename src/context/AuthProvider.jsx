import {useEffect, useState} from "react";
import {AuthContext} from "./AuthContext.js";

export function AuthProvider({children}) {
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [username, setUsername] = useState(() => {
        const userStr = localStorage.getItem("user");
        return userStr ? JSON.parse(userStr).username : null;
    });

    useEffect(() => {
        if (token) {
            localStorage.setItem("token", token);
        } else {
            localStorage.removeItem("token");
        }
    }, [token]);

    useEffect(() => {
        if (username) {
            localStorage.setItem("user", JSON.stringify({username}));
        } else {
            localStorage.removeItem("user");
        }
    }, [username]);


    const login = ({token: newToken, username: newUsername}) => {
        setToken(newToken);
        setUsername(newUsername);
    }
    const logout = () => {
        setToken(null);
        setUsername(null);
    }

    return (
        <AuthContext.Provider value={{token, username, login, logout}}>
            {children}
        </AuthContext.Provider>
    );
}
