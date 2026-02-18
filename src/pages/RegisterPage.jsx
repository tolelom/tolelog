import { useEffect } from 'react';
import RegisterBox from "../components/RegisterBox";

export default function RegisterPage() {
    useEffect(() => { document.title = '회원가입 | Tolelog'; }, []);
    return (
        <div>
            <RegisterBox/>
        </div>);
}