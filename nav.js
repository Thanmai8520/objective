import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import barclaysLogo from './img/barclays-logo.png'; // Assuming this is your Barclays logo image
import anotherImage from './img/another-image.png'; // Path to your additional image

const Nav = () => {
    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-barclays-blue">
            <div className="container-fluid">
                {/* Barclays Logo on the left */}
                <a className="navbar-brand" href="/">
                    <img src={barclaysLogo} alt="Barclays Logo" height="30" />
                </a>

                {/* Toggle button for mobile view */}
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>

                {/* Navbar items */}
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav me-auto">
                        <li className="nav-item">
                            <a className="nav-link active" aria-current="page" href="/">Home</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="/about">About</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="/contact">Contact</a>
                        </li>
                    </ul>
                    
                    {/* Another image on the right */}
                    <img src={anotherImage} alt="Another Image" height="30" className="ms-auto" />
                </div>
            </div>
        </nav>
    );
};

export default Nav;
