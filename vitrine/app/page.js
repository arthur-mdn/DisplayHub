"use client";

import Image from "next/image";
import styles from "./page.module.css";
import {useForm, ValidationError} from "@formspree/react";

function IconScan({className}) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 3H4a1 1 0 0 0-1 1v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M17 3h3a1 1 0 0 1 1 1v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M7 21H4a1 1 0 0 1-1-1v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M17 21h3a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <rect x="7.5" y="7.5" width="9" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M3 12h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
    );
}

function IconAdjust({className}) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M18 7h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="16" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M4 17h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M10 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="8" cy="17" r="2.2" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M4 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M14 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.8"/>
        </svg>
    );
}

function IconLive({className}) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="2.75" y="5.75" width="14.5" height="10.5" rx="1.6" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M17.5 9.5 21.25 7v8L17.5 12.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            <circle cx="10" cy="11" r="1.6" fill="currentColor"/>
        </svg>
    );
}

function ContactForm() {
    const [state, handleSubmit] = useForm("xayrzbbb");

    if (state.succeeded) {
        return (
            <div className={styles.formSuccess}>
                <Image src={"/check.png"} alt="" width={72} height={72}/>
                <p>Merci. On vous recontacte très vite pour votre accès bêta.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.formLabel} htmlFor="email">
                Adresse e-mail
            </label>
            <div className={styles.formRow}>
                <input
                    id="email"
                    className={styles.formInput}
                    type="email"
                    placeholder="vous@entreprise.com"
                    name="email"
                    required
                />
                <ValidationError prefix="Email" field="email" errors={state.errors}/>
                <button type="submit" disabled={state.submitting} className={styles.formButton}>
                    Demander l&apos;accès
                </button>
            </div>
        </form>
    );
}

export default function Home() {
    return (
        <div className={styles.page}>
            <header className={styles.topbar}>
                <a href="#top" className={styles.brandMark} aria-label="DisplayHub">
                    <Image
                        src={"/logo.png"}
                        alt="DisplayHub"
                        width={200}
                        height={40}
                        className={styles.brandLogo}
                        priority
                    />
                </a>
                <nav className={styles.nav}>
                    <a href="#beta">Bêta</a>
                    <a href="#features">Fonctions</a>
                    <a href="#access">Accès anticipé</a>
                </nav>
            </header>

            <main id="top">
                <section className={styles.hero}>
                    <div className={styles.heroCopy}>
                        <p className={styles.brandWord}>DisplayHub</p>
                        <h1 className={styles.heroTitle}>
                            L&apos;affichage dynamique, piloté simplement.
                        </h1>
                        <p className={styles.heroLead}>
                            Diffusez directions, météo, photos et messages sur vos écrans,
                            depuis une console unique. DisplayHub est encore en bêta.
                        </p>
                        <div className={styles.heroActions}>
                            <a href="#access" className={styles.btnPrimary}>
                                Obtenir un accès anticipé
                            </a>
                            <a href="#features" className={styles.btnGhost}>
                                Voir ce qui est prêt
                            </a>
                        </div>
                    </div>

                    <div className={styles.heroVisual}>
                        <Image
                            src={"/displayhub-mark.webp"}
                            alt="Aperçu d'un écran DisplayHub"
                            width={1800}
                            height={1451}
                            className={styles.heroImage}
                            priority
                        />
                    </div>
                </section>

                <section id="beta" className={styles.section}>
                    <div className={styles.sectionIntro}>
                        <h2>Encore sous bêta, déjà utile au quotidien</h2>
                        <p>
                            DisplayHub évolue avec les retours des premiers utilisateurs.
                            L&apos;objectif est clair : une solution d&apos;affichage stable,
                            lisible et rapide à configurer, sans complexité inutile.
                        </p>
                    </div>
                    <div className={styles.betaGrid}>
                        <article className={styles.betaBlock}>
                            <h3>Ce qui est déjà disponible</h3>
                            <p>
                                Gestion multi-écrans, directions, galerie photo, widget météo,
                                mode sombre programmé, textes défilants et partage d&apos;accès
                                entre collaborateurs.
                            </p>
                        </article>
                        <article className={styles.betaBlock}>
                            <h3>Pourquoi ouvrir la bêta maintenant</h3>
                            <p>
                                On valide les usages réels en entreprise, mairie et accueil
                                public. Votre retour guide les priorités avant une version
                                plus large.
                            </p>
                        </article>
                        <article className={styles.betaBlock}>
                            <h3>Ce que ça change pour vous</h3>
                            <p>
                                Accès anticipé, accompagnement de près, et une voix directe
                                sur la feuille de route. Pas de promesse marketing creuse :
                                du produit qui avance.
                            </p>
                        </article>
                    </div>
                </section>

                <section id="features" className={styles.section}>
                    <div className={styles.sectionIntro}>
                        <h2>Tout ce qu&apos;il faut pour un écran vivant</h2>
                        <p>
                            Une interface d&apos;administration claire, un rendu écran pensé
                            pour la lecture à distance, et une mise à jour en direct.
                        </p>
                    </div>

                    <div className={styles.featureList}>
                        <div className={styles.featureRow}>
                            <div className={styles.featureCopy}>
                                <h3>Directions lisibles en un coup d&apos;œil</h3>
                                <p>
                                    Flèches, titres et descriptions densifiés pour guider
                                    visiteurs et collaborateurs. Réordonnez le contenu
                                    en glisser-déposer.
                                </p>
                            </div>
                            <div className={styles.featureAside} data-tone="directions"/>
                        </div>
                        <div className={styles.featureRow}>
                            <div className={styles.featureCopy}>
                                <h3>Galerie et météo sur le même écran</h3>
                                <p>
                                    Faites défiler vos photos et placez le widget météo
                                    où il reste utile, sans encombrer la lecture.
                                </p>
                            </div>
                            <div className={styles.featureAside} data-tone="gallery"/>
                        </div>
                        <div className={styles.featureRow}>
                            <div className={styles.featureCopy}>
                                <h3>Pilotage multi-écrans et droits fins</h3>
                                <p>
                                    Suivez le statut en ligne, partagez l&apos;accès avec
                                    des permissions précises, et gardez la main sur chaque
                                    affichage.
                                </p>
                            </div>
                            <div className={styles.featureAside} data-tone="control"/>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionIntro}>
                        <h2>En place en trois temps</h2>
                        <p>De l&apos;association de l&apos;écran à la diffusion, le parcours reste court.</p>
                    </div>
                    <ol className={styles.steps}>
                        <li>
                            <div className={styles.stepIcon} aria-hidden="true">
                                <IconScan className={styles.stepSvg}/>
                            </div>
                            <div>
                                <h3>Associez votre écran</h3>
                                <p>Scannez le QR code affiché ou saisissez le code pour le relier à votre compte.</p>
                            </div>
                        </li>
                        <li>
                            <div className={styles.stepIcon} aria-hidden="true">
                                <IconAdjust className={styles.stepSvg}/>
                            </div>
                            <div>
                                <h3>Composez le contenu</h3>
                                <p>Ajoutez logo, directions, photos, météo et messages selon le besoin.</p>
                            </div>
                        </li>
                        <li>
                            <div className={styles.stepIcon} aria-hidden="true">
                                <IconLive className={styles.stepSvg}/>
                            </div>
                            <div>
                                <h3>Diffusez en direct</h3>
                                <p>Les changements partent vers l&apos;écran sans redeploiement manuel.</p>
                            </div>
                        </li>
                    </ol>
                </section>

                <section id="access" className={styles.access}>
                    <div className={styles.accessInner}>
                        <p className={styles.accessBrand}>DisplayHub</p>
                        <h2>Rejoindre la bêta</h2>
                        <p>
                            Laissez votre e-mail pour obtenir un accès anticipé.
                            On vous contacte avec les prochaines étapes.
                        </p>
                        <ContactForm/>
                    </div>
                </section>
            </main>

            <footer className={styles.footer}>
                <div className={styles.footerBrand}>
                    <strong>DisplayHub</strong>
                    <span>Affichage dynamique en bêta</span>
                </div>
                <p>© {new Date().getFullYear()} DisplayHub</p>
            </footer>
        </div>
    );
}
