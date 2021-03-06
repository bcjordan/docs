// Packages
import React, { Component } from 'react'
import fetchAPI from '~/lib/fetch-api'
import { readToken } from '~/lib/authenticate'
import { API_DOCS_FEEDBACK, PRODUCT_DOMAIN } from '~/lib/constants'
import cn from 'classnames'
import { UserContext } from '~/lib/user-context'

// Components
import Button from '~/components/buttons'
import Input from '~/components/input'
import Textarea from '~/components/textarea'
import ClickOutside from '~/components/click-outside'
import { H5 } from '~/components/text'

const EMOJIS = new Map([
  ['😭', 'f62d'],
  ['😕', 'f615'],
  ['🙂', 'f600'],
  ['🤩', 'f929']
])
let EMOJI_CODES = null

function getEmoji(code) {
  if (code === null) return code

  if (EMOJI_CODES === null) {
    EMOJI_CODES = new Map([...EMOJIS].map(([k, v]) => [v, k]))
  }
  return EMOJI_CODES.get(code)
}

export default class GuidesFeedback extends Component {
  state = {
    emoji: null,
    loading: false,
    focused: false,
    success: false,
    emojiShown: false,
    errorMessage: null,
    value: '',
    emailValue: null,
    dryRun: false,
    inputFocused: null
  }

  clearSuccessTimer = null
  textAreaRef = null
  emailInputRef = null

  handleTextAreaRef = node => {
    this.textAreaRef = node
  }

  handleEmailRef = node => {
    this.emailInputRef = node
  }

  setError = error => {
    this.setState({ errorMessage: error })
  }

  onFocus = () => {
    this.setState({ focused: true })
  }

  onErrorDismiss = () => {
    this.setState({ errorMessage: null })
  }

  setSuccessState = state => {
    this.setState({ success: state })
  }

  onKeyDown = e => {
    if (e.keyCode === 27) {
      this.setState({ focused: false })
    }
  }

  done = errorMessage => {
    if (!errorMessage) {
      this.setState({ loading: false, success: true })
    } else {
      this.setState({ errorMessage, loading: false, emoji: null })
    }
  }

  onSubmit = event => {
    event.preventDefault()

    if (this.textAreaRef && this.textAreaRef.value.trim() === '') {
      this.setState({
        errorMessage: "Your feedback can't be empty"
      })
      return
    }

    this.setState({ loading: true }, () => {
      if (this.state.dryRun) {
        this.setState({ loading: false, success: true, value: '' })
        return
      }

      fetchAPI(API_DOCS_FEEDBACK, readToken(), {
        method: 'POST',
        body: JSON.stringify({
          url:
            window.location.hostname === 'localhost'
              ? `https://${PRODUCT_DOMAIN}/dev-mode${window.location.pathname}`
              : window.location.toString(),
          note: this.textAreaRef ? this.textAreaRef.value : '',
          email: this.state.emailValue || '',
          emotion: getEmoji(this.state.emoji),
          label: window.location.pathname.includes('guides')
            ? 'guides'
            : 'docs',
          ua: `docs ${process.env.NEXT_PUBLIC_VERSION} + ${
            navigator.userAgent
          } (${navigator.language || 'unknown language'})`
        }),
        throwOnHTTPError: true
      })
        .then(() => {
          this.setState({ loading: false, success: true })
        })
        .catch(err => {
          this.setState({ loading: false, errorMessage: err })
        })
    })
  }

  handleClickOutside = () => {
    this.setState({ focused: false, emoji: null })
  }

  onEmojiSelect = emoji => {
    this.setState({ emoji, focused: true })
  }

  handleChange = e => {
    if (this.state.focused) {
      this.setState({
        value: e
      })
    }
  }

  handleEmailChange = e => {
    if (this.state.focused) {
      this.setState({
        emailValue: e
      })
    }
  }

  handleFocusedInput = inputRef => {
    if (this.state.focused) {
      this.setState({
        inputFocused: inputRef
      })
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.focused) {
      // textarea was hidden if we were showing an error message and
      // now we hide it
      if (
        prevState.errorMessage !== null &&
        this.state.errorMessage == null &&
        this.state.inputFocused
      ) {
        this.state.inputFocused.focus({ preventScroll: true })
      }

      if (!prevState.focused) {
        window.addEventListener('keydown', this.onKeyDown)

        if (this.emailInputRef) {
          // this.emailInputRef.focus({ preventScroll: true })
          // Wait for CSS appear transition to end before focusing.
          // Without this, iOS keyboard will cover the text input
          const listener = () => {
            this.emailInputRef.removeEventListener('transitionend', listener)
          }
          this.emailInputRef.focus({ preventScroll: true })
          this.emailInputRef.addEventListener('transitionend', listener)
        }
      }

      // If a value exists, add it back to the textarea when focused
      this.textAreaRef.value = this.state.value
    } else if (prevState.focused && this.textAreaRef) {
      // needed for when we e.g.: unfocus based on pressing escape
      this.textAreaRef.blur()

      // if we unfocused and there was an error before,
      // clear it
      if (prevState.errorMessage && this.textAreaRef) {
        this.setState({ errorMessage: null }) // eslint-disable-line react/no-did-update-set-state
      }

      // if we had a success message
      // clear it
      if (prevState.success) {
        this.setState({ success: false }) // eslint-disable-line react/no-did-update-set-state
      }

      window.removeEventListener('keydown', this.onKeyDown)
    }

    if (this.state.success && this.textAreaRef) {
      // forget about input state
      this.textAreaRef.value = ''

      // collapse in 5s
      this.clearSuccessTimer = window.setTimeout(() => {
        if (!document.hidden) {
          this.setState({ success: false })
        }
      }, 5000)
    } else {
      if (prevState.success) {
        window.clearTimeout(this.clearSuccessTimer)
        this.clearSuccessTimer = null
      }

      if (prevState.success && this.state.focused) {
        this.setState({ focused: false, emoji: null, value: '' }) // eslint-disable-line react/no-did-update-set-state
      }
    }
  }

  componentWillUnmount() {
    if (this.clearSuccessTimer !== null) {
      clearTimeout(this.clearSuccessTimer)
      this.clearSuccessTimer = null
    }

    window.removeEventListener('keydown', this.onKeyDown)
  }

  render() {
    const { focused, value } = this.state
    const { className, textAreaStyle, ...props } = this.props

    return (
      <div className="feedback">
        <H5>Was this helpful?</H5>
        <ClickOutside
          active={focused}
          onClick={this.handleClickOutside}
          render={({ innerRef }) => (
            <form
              ref={innerRef}
              title="Share any feedback about our products and services"
              onSubmit={this.onSubmit}
              className={cn(
                'geist-feedback-input',
                {
                  focused,
                  error: this.state.errorMessage,
                  loading: this.state.loading,
                  success: this.state.success
                },
                className
              )}
              {...props}
            >
              <span className="emojis">
                <EmojiSelector
                  onSelect={this.onEmojiSelect}
                  loading={this.state.loading}
                  current={this.state.emoji}
                />
              </span>
              <div className="textarea-wrapper">
                <UserContext.Consumer>
                  {({ user }) =>
                    !user && (
                      <div className="input">
                        <label>Email</label>
                        <Input
                          innerRef={this.handleEmailRef}
                          onFocus={() =>
                            this.handleFocusedInput(this.emailInputRef)
                          }
                          type="email"
                          placeholder="Your email address..."
                          width="100%"
                          disabled={
                            this.state.loading === true ||
                            this.state.errorMessage != null
                          }
                          onChange={this.handleEmailChange}
                        />
                      </div>
                    )
                  }
                </UserContext.Consumer>

                <div className="input">
                  <label>Feedback</label>
                  <Textarea
                    style={textAreaStyle}
                    innerRef={this.handleTextAreaRef}
                    onFocus={() => this.handleFocusedInput(this.textAreaRef)}
                    value={value}
                    width="100%"
                    placeholder="Your feedback..."
                    onChange={this.handleChange}
                    aria-label="Feedback input"
                    disabled={
                      this.state.loading === true ||
                      this.state.errorMessage != null
                    }
                  />
                </div>

                {this.state.errorMessage != null && (
                  <div className="error-message">
                    <span>{this.state.errorMessage}</span>
                    <Button
                      medium
                      onClick={e => {
                        e.preventDefault()
                        this.onErrorDismiss()
                      }}
                    >
                      GO BACK
                    </Button>
                  </div>
                )}

                {this.state.success && (
                  <div className="success-message">
                    <p>Your feedback has been received!</p>
                    <p>Thank you for your help.</p>
                  </div>
                )}

                {this.state.errorMessage == null && !this.state.success && (
                  <div className="controls">
                    {
                      <span
                        className={`buttons ${
                          this.state.emojiShown ? 'hidden' : ''
                        }`}
                      >
                        <Button medium loading={this.state.loading} width={60}>
                          Send
                        </Button>
                      </span>
                    }
                  </div>
                )}
              </div>
            </form>
          )}
        />

        <style jsx>
          {`
            .feedback {
              text-align: center;
              display: flex;
              width: 100%;
              flex-direction: column;
              align-items: center;
            }

            .geist-feedback-input {
              padding: 0;
              position: relative;
              display: inline-block;
              transition: all 150ms ease-out;
              font-family: var(--font-sans);
              text-rendering: optimizeLegibility;
              -webkit-font-smoothing: antialiased;
              max-width: 86vw;
              width: 408px;
            }

            .textarea-wrapper {
              appearance: none;
              border-width: 0;
              background: #f9f9f9;
              padding: var(--geist-gap-half);
              height: 0px;
              width: 100%;
              opacity: 0;
              line-height: 24px;
              font-size: 16px;
              border-radius: 4px;
              font-family: var(--font-sans);
              resize: none;
              vertical-align: top;
              /* fixes a bug in ff where the animation of the chat
                    * counter appears on top of our input during its transition */
              z-index: 100;
              outline: 0;
              color: #000;
              overflow-y: hidden;
              text-rendering: optimizeLegibility;
              -webkit-font-smoothing: antialiased;
              margin-top: 16px;
              transition: all 150ms ease-out, border-radius 150ms step-start;
            }

            .geist-feedback-input .input {
              margin-bottom: var(--geist-gap-half);
            }

            .geist-feedback-input .input label {
              margin: 0;
              display: block;
              text-align: left;
              font-weight: 500;
              font-size: 12px;
              text-transform: uppercase;
              margin-top: 0px;
              margin-bottom: var(--geist-gap-half);
              line-height: normal;
              color: var(--accents-5);
            }

            .geist-feedback-input.error.focused .textarea-wrapper .input,
            .geist-feedback-input.success.focused .textarea-wrapper .input {
              pointer-events: none;
              opacity: 0;
            }

            .geist-feedback-input.error .input,
            .geist-feedback-input.success .input {
              color: transparent;
              user-select: none;
            }

            .geist-feedback-input.loading .input {
              color: #ccc;
            }

            .geist-feedback-input .input > *::placeholder {
              color: var(--accents-5);
              transition: color 0.2s ease-in-out;
            }

            .geist-feedback-input.focused .textarea-wrapper {
              display: block;
              width: 100%;
              padding-bottom: 40px;
              border-radius: 4px;
              overflow: hidden;
              position: relative;
              transition: all 150ms ease-out, border-radius 150ms step-end;
              z-index: 999;
              background: #fff;
              height: 272px;
              opacity: 1;
            }

            .error-message,
            .success-message {
              position: absolute;
              left: 0;
              top: 0;
              z-index: 1001;
              width: 100%;
              font-size: 14px;
              height: 100%;
              line-height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              padding: 20px;
              flex-direction: column;
            }

            .success-message p {
              margin: 0;
              opacity: 0;
              animation: appear 500ms ease forwards;
            }

            .success-message p:first-of-type {
              margin-bottom: var(--geist-gap-half);
              animation-delay: 100ms;
            }

            .success-message p:nth-of-type(2) {
              animation-delay: 500ms;
            }

            .error-message span {
              color: #eb5757;
              margin-bottom: 20px;
            }

            .error-message a {
              color: #000;
              text-decoration: none;
            }

            .geist-feedback-input.focused .controls {
              display: flex;
            }

            .controls {
              pointer-events: none;
              visibility: hidden;
              opacity: 0;
              width: 100%;
              background-color: white;
              display: flex;
              align-items: center;
              border-bottom-left-radius: 5px;
              border-bottom-right-radius: 5px;
            }

            .emojis {
              width: 100%;
              display: flex;
              justify-content: center;
            }

            .controls .buttons {
              flex: 1;
              text-align: right;
              transition: opacity 200ms ease;
            }

            .controls .buttons.hidden {
              opacity: 0;
            }

            .geist-feedback-input.focused .controls {
              animation-name: appear;
              animation-delay: 250ms;
              animation-duration: 150ms;
              animation-timing-function: ease-out;
              animation-fill-mode: forwards;
              pointer-events: inherit;
              z-index: 1001;
              visibility: visible;
            }

            @keyframes appear {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
          `}
        </style>
      </div>
    )
  }
}

class EmojiSelector extends Component {
  render() {
    return (
      <main
        className={cn('geist-emoji-selector', 'shown', {
          loading: this.props.loading || this.props.success
        })}
      >
        {Array.from(EMOJIS.values()).map(emoji => (
          <button
            type="button"
            className={cn('option', { active: this.props.current === emoji })}
            key={emoji}
            onMouseEnter={this.onMouseEnter}
            onTouchStart={this.onMouseEnter}
            onMouseLeave={this.onMouseLeave}
            onClick={() => this.props.onSelect(emoji)}
          >
            <span className="inner">
              <Emoji code={emoji} />
            </span>
          </button>
        ))}

        <style jsx>
          {`
            .geist-emoji-selector {
              display: flex;
              pointer-events: none;
            }

            .geist-emoji-selector.loading {
              filter: grayscale(100%);
              -webkit-filter: grayscale(100%);
              cursor: default;
              pointer-events: none;
            }

            .geist-emoji-selector > button {
              background: transparent;
              border: 0;
              padding: 0;
              margin: 0;
            }

            .geist-emoji-selector > button,
            .geist-emoji-selector > button .inner {
              display: inline-flex;
            }

            .geist-emoji-selector > button {
              padding: 2px 3px;
              cursor: pointer;
              text-align: center;
              filter: grayscale(100%);
              -webkit-filter: grayscale(100%);
            }

            .geist-emoji-selector.loading > button {
              cursor: default;
              transition: transform 0.2s ease;
            }

            .geist-emoji-selector > button:first-child {
              outline: none;
              pointer-events: all;
            }

            .geist-emoji-selector.loading > button:first-child {
              outline: none;
              pointer-events: none;
            }

            .geist-emoji-selector > button:not(:last-child) {
              margin-right: 12px;
            }

            .geist-emoji-selector > button .inner {
              height: 40px;
              width: 40px;
              justify-content: center;
              align-items: center;
              padding: 3px;
            }

            .geist-emoji-selector > button .inner.icon {
              padding: 3px 2px 2px 2px;
            }

            .geist-emoji-selector > button.active .inner,
            .geist-emoji-selector > button:hover .inner {
              border-color: #f8e71c;
            }

            .geist-emoji-selector > button.option {
              opacity: 0;
              transition: all ease 100ms;
              transform-origin: center center;
              pointer-events: none;
              will-change: transform, filter;
            }

            .geist-emoji-selector > button:hover,
            .geist-emoji-selector > button.active {
              transform: scale(1.35);
              filter: grayscale(0);
              -webkit-filter: grayscale(0);
            }

            .geist-emoji-selector.shown > button.option {
              pointer-events: all;
              opacity: 1;
            }
          `}
        </style>
      </main>
    )
  }
}

const Emoji = React.memo(({ code }) => (
  <img
    decoding="async"
    width={code === 'f600' || code === 'f62d' || code === 'f615' ? 24 : 22}
    height={code === 'f600' || code === 'f62d' || code === 'f615' ? 24 : 22}
    src={`https://assets.vercel.com/twemoji/1${code}.svg`}
    alt="emoji"
    style={{
      transform:
        code === 'f600' || code === 'f615' ? 'translateY(0.5px)' : 'none'
    }}
  />
))
