import {useContext} from "react";
import {Navigate} from "react-router-dom";
import {AuthContext} from "../context/AuthContext.js";


export default function PrivateRoute({ children }) {
    const { token } = useContext(AuthContext);
    return token ? children : <Navigate to={'/login'} />;
}