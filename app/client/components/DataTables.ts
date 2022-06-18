import {GristDoc} from 'app/client/components/GristDoc';
import {copyToClipboard} from 'app/client/lib/copyToClipboard';
import {localStorageObs} from 'app/client/lib/localStorageObs';
import {setTestState} from 'app/client/lib/testState';
import {TableRec} from 'app/client/models/DocModel';
import {docListHeader, docMenuTrigger} from 'app/client/ui/DocMenuCss';
import {showTransientTooltip} from 'app/client/ui/tooltips';
import {buildTableName} from 'app/client/ui/WidgetTitle';
import {buttonSelect, cssButtonSelect} from 'app/client/ui2018/buttonSelect';
import * as css from 'app/client/ui2018/cssVars';
import {icon} from 'app/client/ui2018/icons';
import {menu, menuItem, menuText} from 'app/client/ui2018/menus';
import {confirmModal} from 'app/client/ui2018/modals';
import {Computed, Disposable, dom, fromKo, makeTestId, Observable, styled} from 'grainjs';

const testId = makeTestId('test-raw-data-');

export class DataTables extends Disposable {
  private _tables: Observable<TableRec[]>;
  private _view: Observable<string | null>;
  constructor(private _gristDoc: GristDoc) {
    super();
    // Remove tables that we don't have access to. ACL will remove tableId from those tables.
    this._tables = Computed.create(this, use =>
      use(_gristDoc.docModel.rawTables.getObservable())
      .filter(t => Boolean(use(t.tableId))));
    // Get the user id, to remember selected layout on the next visit.
    const userId = this._gristDoc.app.topAppModel.appObs.get()?.currentUser?.id ?? 0;
    this._view = this.autoDispose(localStorageObs(`u=${userId}:raw:viewType`, "list"));
  }

  public buildDom() {
    return container(
      cssTableList(
        /***************  List section **********/
        testId('list'),
        cssBetween(
          docListHeader('Raw data tables'),
          cssSwitch(
            buttonSelect<any>(
              this._view,
              [
                {value: 'card', icon: 'TypeTable'},
                {value: 'list', icon: 'TypeCardList'},
              ],
              css.testId('view-mode'),
              cssButtonSelect.cls("-light")
            )
          )
        ),
        cssList(
          cssList.cls(use => `-${use(this._view)}`),
          dom.forEach(this._tables, tableRec =>
            cssItem(
              testId('table'),
              cssLeft(
                dom.domComputed(tableRec.tableId, (tableId) =>
                  cssGreenIcon(
                    'TypeTable',
                    testId(`table-id-${tableId}`)
                  )
                ),
              ),
              cssMiddle(
                css60(
                  testId('table-title'),
                  dom.domComputed(fromKo(tableRec.rawViewSectionRef), vsRef => {
                    if (!vsRef) {
                      // Some very old documents might not have rawViewSection.
                      return dom('span', dom.text(tableRec.tableNameDef));
                    } else {
                      return dom('div', // to disable flex grow in the widget
                        dom.domComputed(fromKo(tableRec.rawViewSection), vs =>
                          dom.update(
                            buildTableName(vs, testId('widget-title')),
                            dom.on('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); }),
                          )
                        )
                      );
                    }
                  }),
                ),
                css40(
                  cssIdHoverWrapper(
                    cssUpperCase("Table id: "),
                    cssTableId(
                      testId('table-id'),
                      dom.text(tableRec.tableId),
                    ),
                    { title : 'Click to copy' },
                    dom.on('click', async (e, t) => {
                      e.stopImmediatePropagation();
                      e.preventDefault();
                      showTransientTooltip(t, 'Table id copied to clipboard', {
                        key: 'copy-table-id'
                      });
                      await copyToClipboard(tableRec.tableId.peek());
                      setTestState({clipboard: tableRec.tableId.peek()});
                    })
                  )
                ),
              ),
              cssRight(
                docMenuTrigger(
                  testId('table-menu'),
                  icon('Dots'),
                  menu(() => this._menuItems(tableRec), {placement: 'bottom-start'}),
                  dom.on('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); }),
                )
              ),
              dom.on('click', () => {
                const sectionId = tableRec.rawViewSection.peek().getRowId();
                if (!sectionId) {
                  throw new Error(`Table ${tableRec.tableId.peek()} doesn't have a raw view section.`);
                }
                this._gristDoc.viewModel.activeSectionId(sectionId);
              })
            )
          )
        ),
      ),
    );
  }

  private _menuItems(table: TableRec) {
    const {isReadonly, docModel} = this._gristDoc;
    return [
      menuItem(
        () => this._removeTable(table),
        'Remove',
        testId('menu-remove'),
        dom.cls('disabled', use => use(isReadonly) || (
          // Can't delete last user table, unless it is a hidden table.
          use(docModel.allTables.getObservable()).length <= 1 && !use(table.isHidden)
        ))
      ),
      dom.maybe(isReadonly, () => menuText('You do not have edit access to this document')),
    ];
  }

  private _removeTable(t: TableRec) {
    const {docModel} = this._gristDoc;
    function doRemove() {
      return docModel.docData.sendAction(['RemoveTable', t.tableId.peek()]);
    }
    confirmModal(`Delete ${t.tableId()} data, and remove it from all pages?`, 'Delete', doRemove);
  }
}

const container = styled('div', `
  overflow-y: auto;
  position: relative;
`);

const cssBetween = styled('div', `
  display: flex;
  justify-content: space-between;
`);

// Below styles makes the list view look like a card view
// on smaller screens.

const cssSwitch = styled('div', `
  @media ${css.mediaXSmall} {
    & {
      display: none;
    }
  }
`);

const cssList = styled('div', `
  display: flex;
  &-list {
    flex-direction: column;
    gap: 8px;
  }
  &-card {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 24px;
  }
  @media ${css.mediaSmall} {
    & {
      gap: 12px !important;
    }
  }
`);

const cssItem = styled('div', `
  display: flex;
  align-items: center;
  cursor: pointer;
  border-radius: 3px;
  max-width: 750px;
  border: 1px solid ${css.colors.mediumGrey};
  &:hover {
    border-color: ${css.colors.slate};
  }
  .${cssList.className}-list & {
    min-height: calc(1em * 40/13); /* 40px for 13px font */
  }
  .${cssList.className}-card & {
    width: 300px;
    height: calc(1em * 56/13); /* 56px for 13px font */
  }
  @media ${css.mediaSmall} {
    .${cssList.className}-card & {
      width: calc(50% - 12px);
    }
  }
  @media ${css.mediaXSmall} {
    & {
      width: 100% !important;
      height: calc(1em * 56/13) !important; /* 56px for 13px font */
    }
  }
`);

// Holds icon in top left corner
const cssLeft = styled('div', `
  padding-top: 11px;
  padding-left: 12px;
  margin-right: 8px;
  align-self: flex-start;
  display: flex;
  flex: none;
`);

const cssMiddle = styled('div', `
  flex-grow: 1;
  min-width: 0px;
  display: flex;
  flex-wrap: wrap;
  margin-top: 6px;
  margin-bottom: 4px;
  .${cssList.className}-card & {
    margin: 0px:
  }
`);

const css60 = styled('div', `
  min-width: min(240px, 100%);
  display: flex;
  flex: 6;
`);

const css40 = styled('div', `
  min-width: min(240px, 100%);
  flex: 4;
  display: flex;
`);


// Holds dots menu (which is 24px x 24px, but has its own 4px right margin)
const cssRight = styled('div', `
  padding-right: 8px;
  margin-left: 8px;
  align-self: center;
  display: flex;
  flex: none;
`);

const cssGreenIcon = styled(icon, `
  --icon-color: ${css.colors.lightGreen};
`);

const cssLine = styled('span', `
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
`);

const cssIdHoverWrapper = styled('div', `
  display: flex;
  overflow: hidden;
  cursor: default;
  align-items: baseline;
  color: ${css.colors.slate};
  transition: background 0.05s;
  padding: 1px 2px;
  line-height: 18px;
  &:hover {
    background: ${css.colors.lightGrey};
  }
  @media ${css.mediaSmall} {
    & {
      padding: 0px 2px !important;
    }
  }
`);

const cssTableId = styled(cssLine, `
  font-size: ${css.vars.smallFontSize};
`);

const cssUpperCase = styled('span', `
  text-transform: uppercase;
  letter-spacing: 0.81px;
  font-weight: 500;
  font-size: 9px; /* xxsmallFontSize is to small */
  margin-right: 2px;
  flex: 0;
  white-space: nowrap;
`);

const cssTableList = styled('div', `
  overflow-y: auto;
  position: relative;
  margin-bottom: 56px;
`);
