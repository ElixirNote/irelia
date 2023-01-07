import { Disposable, dom, domComputed, DomContents, MultiHolder, Observable, styled } from "grainjs";

import { handleSubmit, submitForm } from "app/client/lib/formUtils";
import { AppModel, reportError } from "app/client/models/AppModel";
import { getLoginUrl, getSignupUrl, urlState } from "app/client/models/gristUrlState";
import { AccountWidget } from "app/client/ui/AccountWidget";
import { AppHeader } from 'app/client/ui/AppHeader';
import { textInput } from 'app/client/ui/inputs';
import { pagePanels } from "app/client/ui/PagePanels";
import { createUserImage } from 'app/client/ui/UserImage';
import { cssMemberImage, cssMemberListItem, cssMemberPrimary,
         cssMemberSecondary, cssMemberText } from 'app/client/ui/UserItem';
import { basicButtonLink, bigBasicButtonLink, bigPrimaryButton, bigPrimaryButtonLink,
         cssButton } from "app/client/ui2018/buttons";
import { colors, mediaSmall, testId, vars } from "app/client/ui2018/cssVars";
import { getOrgName, Organization } from "app/common/UserAPI";

// Redirect from ..../welcome/thing to .../welcome/${name}
function _redirectToSiblingPage(name: string) {
  const url = new URL(location.href);
  const parts = url.pathname.split('/');
  parts.pop();
  parts.push(name);
  url.pathname = parts.join('/');
  window.location.assign(url.href);
}

function handleSubmitForm(
  pending: Observable<boolean>,
  onSuccess: (v: any) => void,
  onError?: (e: unknown) => void
): (elem: HTMLFormElement) => void {
  return handleSubmit(pending, submitForm, onSuccess, onError);
}

export class WelcomePage extends Disposable {

  private _orgs: Organization[];
  private _orgsLoaded = Observable.create(this, false);

  constructor(private _appModel: AppModel) {
    super();
  }

  public buildDom() {
    return pagePanels({
      leftPanel: {
        panelWidth: Observable.create(this, 240),
        panelOpen: Observable.create(this, false),
        hideOpener: true,
        header: dom.create(AppHeader, '', this._appModel),
        content: null,
      },
      headerMain: [cssFlexSpace(), dom.create(AccountWidget, this._appModel)],
      contentMain: this.buildPageContent()
    });
  }

  public buildPageContent(): Element {
    return cssScrollContainer(cssContainer(
      cssTitle('Welcome to Irelia'),
      testId('welcome-page'),

      domComputed(urlState().state, (state) => (
        state.welcome === 'signup' ? dom.create(this._buildSignupForm.bind(this)) :
        state.welcome === 'verify' ? dom.create(this._buildVerifyForm.bind(this)) :
        state.welcome === 'teams' ? dom.create(this._buildOrgPicker.bind(this)) :
        state.welcome === 'select-account' ? dom.create(this._buildAccountPicker.bind(this)) :
        null
      )),
    ));
  }

  private _buildSignupForm(owner: MultiHolder) {
    let inputEl: HTMLInputElement;
    const pending = Observable.create(owner, false);

    // delayed focus
    setTimeout(() => inputEl.focus(), 10);

    // We expect to have an email query parameter on welcome/signup.
    // TODO: make form work without email parameter - except the real todo is:
    // TODO: replace this form with Amplify.
    const url = new URL(location.href);
    const email = Observable.create(owner, url.searchParams.get('email') || '');
    const password = Observable.create(owner, '');

    const action = new URL(window.location.href);
    action.pathname = '/signup/register';

    return dom(
      'form',
      { method: "post", action: action.href },
      handleSubmitForm(pending, () => _redirectToSiblingPage('verify')),
      dom('p',
          `Welcome Sumo-ling! ` +  // This flow currently only used with AppSumo.
          `Your Irelia site is almost ready. Let's get your account set up and verified. ` +
          `If you already have a Grist account as `,
          dom('b', email.get()),
          ` you can just `,
          dom('a', {href: getLoginUrl()}, 'log in'),
          ` now. Otherwise, please pick a password.`
         ),
      cssSeparatedLabel('The email address you activated Grist with:'),
      cssInput(
        email, { onInput: true, },
        { name: "emailShow" },
        dom.boolAttr('disabled', true),
        dom.attr('type', 'email'),
      ),
      // Duplicate email as a hidden form since disabled input won't get submitted
      // for some reason.
      cssInput(
        email, { onInput: true, },
        { name: "email" },
        dom.boolAttr('hidden', true),
        dom.attr('type', 'email'),
      ),
      cssSeparatedLabel('A password to use with Grist:'),
      inputEl = cssInput(
        password, { onInput: true, },
        { name: "password" },
        dom.attr('type', 'password'),
      ),
      cssButtonGroup(
        bigPrimaryButton(
          'Continue',
          testId('continue-button')
        ),
        bigBasicButtonLink('Did this already', dom.on('click', () => {
          _redirectToSiblingPage('verify');
        }))
      ),
    );
  }

  private _buildVerifyForm(owner: MultiHolder) {
    let inputEl: HTMLInputElement;
    const pending = Observable.create(owner, false);

    // delayed focus
    setTimeout(() => inputEl.focus(), 10);

    const action = new URL(window.location.href);
    action.pathname = '/signup/verify';

    const url = new URL(location.href);
    const email = Observable.create(owner, url.searchParams.get('email') || '');
    const code = Observable.create(owner, url.searchParams.get('code') || '');
    return dom(
      'form',
      { method: "post", action: action.href },
      handleSubmitForm(pending, (result) => {
        if (result.status === 'confirmed') {
          const verified = new URL(window.location.href);
          verified.pathname = '/verified';
          window.location.assign(verified.href);
        } else if (result.status === 'resent') {
          // just to give a sense that something happened...
          window.location.reload();
        }
      }),
      dom('p',
          `Please check your email for a 6-digit verification code, and enter it here.`),
      dom('p',
          `If you've any trouble, try our full set of sign-up options. Do take care to use ` +
          `the email address you activated with: `,
          dom('b', email.get())),
      cssSeparatedLabel('Confirmation code'),
      inputEl = cssInput(
        code, { onInput: true, },
        { name: "code" },
        dom.attr('type', 'number'),
      ),
      cssInput(
        email, { onInput: true, },
        { name: "email" },
        dom.boolAttr('hidden', true),
      ),
      cssButtonGroup(
         bigPrimaryButton(
           dom.domComputed(code, c => c ?
                           'Apply verification code' : 'Resend verification email')
        ),
        bigBasicButtonLink('More sign-up options',
                           {href: getSignupUrl()})
      )
    );
  }

  private async _fetchOrgs() {
    this._orgs = await this._appModel.api.getOrgs(true);
    this._orgsLoaded.set(true);
  }


  private _buildOrgPicker(): DomContents {
    this._fetchOrgs().catch(reportError);
    return dom.maybe(this._orgsLoaded, () => {
      let orgs = this._orgs;
      if (orgs && orgs.length > 1) {

        // Let's make sure that the first org is not the personal org.
        if (orgs[0].owner) {
          orgs = [...orgs.slice(1), orgs[0]];
        }

        return [
          cssParagraph(
            "You've been added to a team. ",
            "Go to the team site, or to your personal site."
          ),
          cssParagraph(
            "You can always switch sites using the account menu in the top-right corner."
          ),
          orgs.map((org, i) => (
            cssOrgButton(
              getOrgName(org),
              urlState().setLinkUrl({org: org.domain || undefined}),
              testId('org'),
              i ? cssButton.cls('-primary', false) : null
            )
          )),
        ];
      }
    });
  }

  private _buildAccountPicker(): DomContents {
    function addUserToLink(email: string): string {
      const next = new URLSearchParams(location.search).get('next') || '';
      const url = new URL(next, location.href);
      url.searchParams.set('user', email);
      return url.toString();
    }

    return [
      cssParagraph(
        "Select an account to continue with.",
      ),
      dom.maybe(this._appModel.topAppModel.users, users =>
        users.map(user => basicButtonLink(
          cssUserItem.cls(''),
          cssMemberListItem(
            cssMemberImage(
              createUserImage(user, 'large')
            ),
            cssMemberText(
              cssMemberPrimary(user.name || dom('span', user.email, testId('select-email'))),
              user.name ? cssMemberSecondary(user.email, testId('select-email')) : null
            ),
          ),
          {href: addUserToLink(user.email)},
          testId('select-user'),
        )),
      ),
    ];
  }
}

const cssUserItem = styled('div', `
  margin: 0 0 8px;
  align-items: center;
  &:first-of-type {
    margin-top: 16px;
  }
  &:hover {
    background-color: ${colors.lightGrey};
  }
`);

const cssScrollContainer = styled('div', `
  display: flex;
  overflow-y: auto;
  flex-direction: column;
`);

const cssContainer = styled('div', `
  max-width: 450px;
  align-self: center;
  margin: 60px;
  display: flex;
  flex-direction: column;
  &:after {
    content: "";
    height: 8px;
  }
  @media ${mediaSmall} {
    & {
      margin: 24px;
    }
  }
`);

const cssFlexSpace = styled('div', `
  flex: 1 1 0px;
`);

const cssTitle = styled('div', `
  height: 32px;
  line-height: 32px;
  margin: 0 0 28px 0;
  color: ${colors.dark};
  font-size: ${vars.xxxlargeFontSize};
  font-weight: ${vars.headerControlTextWeight};
`);

const textStyle = `
  font-weight: normal;
  font-size: ${vars.mediumFontSize};
  color: ${colors.dark};
`;

// TODO: there's probably a much better way to style labels with a bit of
// space between them and things they are not the label for?
const cssSeparatedLabel = styled('label', textStyle + ' margin-top: 20px;');
const cssParagraph = styled('p', textStyle);

const cssButtonGroup = styled('div', `
  margin-top: 24px;
  display: flex;
  justify-content: space-evenly;
  &-right {
    justify-content: flex-end;
  }
`);

const cssInput = styled(textInput, `
  display: inline;
  height: 42px;
  line-height: 16px;
  padding: 13px;
  border-radius: 3px;
`);

const cssOrgButton = styled(bigPrimaryButtonLink, `
  margin: 0 0 8px;
  width: 200px;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;

  &:first-of-type {
    margin-top: 16px;
  }
`);
