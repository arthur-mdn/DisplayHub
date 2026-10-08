import Image from "next/image";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata = {
    title: "Mentions légales | DisplayHub",
    description: "Mentions légales du site DisplayHub : éditeur, hébergeur et service d'emails."
};

export default function MentionsLegalesPage() {
    return (
        <div className={styles.page}>
            <header className={styles.topbar}>
                <Link href="/" aria-label="DisplayHub">
                    <Image
                        src={"/logo.png"}
                        alt="DisplayHub"
                        width={200}
                        height={40}
                        className={styles.brandLogo}
                        priority
                    />
                </Link>
                <Link href="/" className={styles.navLink}>
                    Retour à l&apos;accueil
                </Link>
            </header>

            <main className={styles.main}>
                <h1 className={styles.title}>Mentions légales</h1>

                <section className={styles.section}>
                    <h2>1. Éditeur du site</h2>
                    <p>
                        Le site DisplayHub est édité par{" "}
                        <a href="https://mondon.pro" target="_blank" rel="noopener noreferrer">
                            Arthur Mondon
                        </a>
                        , micro-entrepreneur (
                        <a href="https://eradion.fr" target="_blank" rel="noopener noreferrer">
                            Eradion
                        </a>
                        ).
                    </p>
                </section>

                <section className={styles.section}>
                    <h2>2. Hébergeur</h2>
                    <p>Le site est hébergé par :</p>
                    <ul>
                        <li>Raison sociale : IONOS SE</li>
                        <li>Adresse du siège social : Elgendorfer Str. 57, 56410 Montabaur, Allemagne</li>
                        <li>Téléphone : +33 (0)9 70 80 89 11 (IONOS France)</li>
                        <li>
                            Formulaire de contact :{" "}
                            <a
                                href="https://www.ionos.fr/help"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Page d&apos;aide IONOS
                            </a>
                        </li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2>3. Service d&apos;emails</h2>
                    <p>
                        L&apos;envoi des emails transactionnels (candidatures, invitations,
                        connexions) est assuré via les services SMTP de :
                    </p>
                    <ul>
                        <li>Raison sociale : LWS (Ligne Web Services), SAS au capital de 500 000 €</li>
                        <li>Siège social : 2 rue Jules Ferry, 88190 Golbey, France</li>
                        <li>SIRET : 851 993 683 00016, RCS Épinal 851 993 683</li>
                        <li>
                            Site web :{" "}
                            <a href="https://www.lws.fr" target="_blank" rel="noopener noreferrer">
                                https://www.lws.fr
                            </a>
                        </li>
                        <li>Téléphone : 01 77 62 30 03</li>
                    </ul>
                </section>
            </main>

            <footer className={styles.footer}>
                <div className={styles.footerBrand}>
                    <strong>DisplayHub</strong>
                    <span>Affichage dynamique en bêta</span>
                </div>
                <div className={styles.footerLinks}>
                    <Link href="/mentions-legales">Mentions légales</Link>
                    <span>© {new Date().getFullYear()} DisplayHub</span>
                </div>
            </footer>
        </div>
    );
}
