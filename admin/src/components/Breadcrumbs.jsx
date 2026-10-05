// Breadcrumbs.jsx
import React, {useEffect, useRef} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {ChevronRight, Menu} from 'lucide-react';
import {getTranslation} from "../../utils/translations.js";

const Breadcrumbs = () => {
    const location = useLocation();
    const breadcrumbRef = useRef(null);

    const pathnames = location.pathname.split('/').filter((x) => x);
    const knownPaths = ['screens', 'list', 'add', 'edit', 'delete', 'programmes', 'profil', 'login', 'register', 'logout', 'admin', 'debug', 'socketControl', 'screen', 'socket', 'name', 'logo', 'icons', 'meteo', 'directions', 'photos', 'dark_mode', 'text_slides', 'allowed_users', 'control', 'avanced_settings'];

    const isObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
    const isSocketId = (id) => /^[0-9a-zA-Z-_]{20}$/.test(id);

    const breadcrumbItems = [];
    for (let i = 0; i < pathnames.length; i++) {
        const value = pathnames[i];
        const to = `/${pathnames.slice(0, i + 1).join('/')}`;
        if (knownPaths.includes(value) || isObjectId(value) || isSocketId(value)) {
            breadcrumbItems.push({
                to,
                displayName: knownPaths.includes(value) ? getTranslation(value) : value
            });
        } else {
            break;
        }
    }
    if (breadcrumbItems.length === 0) {
        breadcrumbItems.push({
            to: '/',
            displayName: 'Accueil'
        });
    }

    useEffect(() => {
        if (breadcrumbRef.current) {
            breadcrumbRef.current.scrollLeft = breadcrumbRef.current.scrollWidth;
        }
    }, [breadcrumbItems]);

    return (
        <nav className={"fr ai-c g1 p1 bread"} ref={breadcrumbRef}>
            <Menu className={"fs-0 hide-mobile"}/>
            <ul className="breadcrumb">
                {breadcrumbItems.map((item, index) => (
                    <li key={item.to}>
                        <Link to={item.to}>
                            {item.displayName}
                        </Link>
                        {index < breadcrumbItems.length - 1 && <ChevronRight/>}
                    </li>
                ))}
            </ul>
        </nav>
    );
};

export default Breadcrumbs;
