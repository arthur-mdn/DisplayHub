import React from "react";
import Breadcrumbs from "../../Breadcrumbs.jsx";
import {Route, Routes} from "react-router-dom";
import SocketList from "./SocketList.jsx";
import SocketDetail from "./SocketDetail.jsx";

function SocketControl () {

    return (
        <>
            <Breadcrumbs/>
            <div className={"p1"}>
                <Routes>
                    <Route path="/screen/:screenId" element={<SocketDetail/>}/>
                    <Route path="/socket/:socketId" element={<SocketDetail/>}/>
                    <Route path="/:socketId" element={<SocketDetail/>}/>
                    <Route path="/" element={<SocketList/>}/>
                </Routes>

            </div>

        </>
    )
}

export default SocketControl;
