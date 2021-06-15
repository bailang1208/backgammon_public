import React, { Component, PropTypes } from 'react';

// Import Style
import styles from './../../../../css/common.css';
import c_styles from './../../../../css/style.css';
// Import Images
import instagram from './../../../../images/instagram.png';
import facebook from './../../../../images/facebook.png';
import telegramhelp from './../../../../images/telegram-help.jpg';

export class Footer extends Component  {
    constructor() {
        super();
    }

    render() {
        return (
            <footer className={styles.clearfix}>
                <div id="social" className={[styles.clearfix, c_styles.social].join(' ')}>
                    <a target="_blank" href="https://www.instagram.com/goldgameclub/"><img src={instagram}/></a>
                    <a target="_blank" href="https://www.facebook.com/goldgame360"><img src={facebook}/></a>
                </div>

                <a href="ajax/terms.php" className={[styles.terms, styles.fancybox_ajax].join(' ')}>Terms</a>

                <div id="telegram_help" className={c_styles.telegram_help}>
                    <a href="http://t.me/goldgame360com" target="_blank"><img src={telegramhelp}/></a>
                </div>
            </footer>
        );
    }
}

export default Footer;
