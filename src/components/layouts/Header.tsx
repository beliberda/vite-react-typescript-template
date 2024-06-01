import Button from "@/components/ui/button"
import logo from "@assets/react.svg"
export default function Header() {
    return (
        <header className="header">
            <img src={logo} alt="" />
            <Button/>
        </header>
    )
}