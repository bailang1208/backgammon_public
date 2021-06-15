import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import Modal from 'react-modal'

// Import Style
import styles from './../../../../css/common.css';
import logo from './../../../../images/logo.png';

const customStyles = {
    content : {
        top                   : '50%',
        left                  : '50%',
        right                 : 'auto',
        bottom                : 'auto',
        marginRight           : '-50%',
        transform             : 'translate(-50%, -50%)',
        background            : 'url(./../../../images/leather.jpg) repeat'
    }
};

export class Header extends Component {
    constructor() {
        super();

        this.state = { loginModalIsOpen: false, joinModalIsOpen: false };
        this.openLoginModal = this.openLoginModal.bind(this);
        this.afterOpenLoginModal = this.afterOpenLoginModal.bind(this);
        this.closeLoginModal = this.closeLoginModal.bind(this);
        this.openJoinModal = this.openJoinModal.bind(this);
        this.afterOpenJoinModal = this.afterOpenJoinModal.bind(this);
        this.closeJoinModal = this.closeJoinModal.bind(this);
    }

    openLoginModal() {
        this.setState({loginModalIsOpen: true, joinModalIsOpen: false});
    }

    afterOpenLoginModal() {

    }

    closeLoginModal() {
        this.setState({loginModalIsOpen: false, joinModalIsOpen: false});
    }

    openJoinModal() {
        this.setState({loginModalIsOpen: false, joinModalIsOpen: true});
    }

    afterOpenJoinModal() {

    }

    closeJoinModal() {
        this.setState({loginModalIsOpen: false, joinModalIsOpen: false});
    }

    render() {
        return (
            <div className={styles.headercont}>
                <div className={[styles.menu, styles.clearfix].join(' ')}>
                    <div className={styles.logo}><a href="#"><img src={logo}/></a></div>
                    <div className={styles.control}>
                        <div className={styles.user}>

                            <button className={styles.login} onClick={this.openLoginModal}>Login</button>
                            <Modal
                                isOpen={this.state.loginModalIsOpen}
                                onAfterOpen={this.afterOpenLoginModal}
                                onRequestClose={this.closeLoginModal}
                                style={customStyles}
                                contentLabel="Example Modal"
                            >
                                <div style={{'minWidth':'300px', overflow:'hidden', border:'1px dashed #f5f5f5', 'borderRadius':'10px', padding:'15px', color:'white'}}>
                                    <div id="logindiv" className={styles._pos_r}>
                                        <form action="#" method="post" id="form_login">
                                            <div className={styles.form_row} style={{'fontWeight':'bold'}}>Login</div>
                                            <div className={styles.form_row}><input type="email" name="eposta" placeholder="E-mail" style={{background: 'white'}} /></div>
                                            <div className={styles.form_row}><input type="password" name="pass" placeholder="Password" style={{background: 'white'}} /></div>
                                            <div className={[styles.form_row, styles.clearfix].join(' ')}>
                                                <input id="loginbtn" type="submit" value="Login" />
                                                <button type="button" className={styles.btngrey} onClick={this.closeLoginModal}>Close</button>

                                                <div style={{float:'right', 'paddingTop':'10px'}}><label><input type="checkbox" name="remember" value="1" /> Remember me</label></div>
                                            </div>
                                            <div className={[styles.form_row, styles.clearfix]} style={{'marginTop':'20px'}}>
                                                <a href="" style={{color:'white'}}>Forgot your password</a>
                                            </div>
                                            <div className={[styles.login_status, styles.overlay_status].join(' ')}></div>
                                            <div className={styles.error}></div>
                                        </form>
                                    </div>
                                </div>
                            </Modal>
                            <button className={styles.join} onClick={this.openJoinModal}>Join</button>
                            <Modal
                                isOpen={this.state.joinModalIsOpen}
                                onAfterOpen={this.afterOpenJoinModal}
                                onRequestClose={this.closeJoinModal}
                                style={customStyles}
                                contentLabel="Example Modal"
                            >
                                <div style={{maxWidth:'450px', minWidth:'250px', overflow:'hidden', border:'1px dashed #f5f5f5', borderRadius:'10px', padding:'15px', color:'white'}}>
                                    <div id="logindiv2" className={styles._pos_r}>
                                        <form action="#" method="post" id="form_join">
                                            <div className={styles.form_row} style={{fontWeight:'bold'}}>New Player Form</div>
                                            <div className={styles.form_row}><input type="text" name="eposta" placeholder="E-mail*" autoComplete="off" required style={{background: 'white'}} /></div>
                                            <div className={styles.form_row}><input type="text" name="username" placeholder="Username (At least 3 chars.)*" autoComplete="off" required style={{background: 'white'}} /></div>
                                            <div className={styles.form_row}><input type="password" name="pass" placeholder="Password (At least 6 chars.)*" autoComplete="off" required style={{background: 'white'}} /></div>
                                            <div className={styles.form_row}><input type="password" name="pass2" placeholder="Password Again*" autoComplete="off" required style={{background: 'white'}} /></div>
                                            <div className={styles.form_row}><input type="submit" value="Sign Up" style={{paddingLeft:'20px', paddingRight:'20px'}} /> <button type="button" className={styles.btngrey} onClick={this.closeJoinModal} >Close</button></div>
                                            <div className={[styles.login_status, styles.overlay_status].join(' ')}></div>
                                            <div className={styles.error}></div>
                                            <div style={{margin:'20px 0 0 0', fontSize:'14px'}}>Already a member <span><a href="#" style={{color:'green'}}>Login</a></span></div>
                                        </form>
                                    </div>
                                </div>
                            </Modal>
                            <select name="lang" className={styles.langsel}>
                                <option value="en_en">English</option>
                                <option value="tr_tr">Turkish</option>
                                <option value="fa_fa">Persian</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Header;
