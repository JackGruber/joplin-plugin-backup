import { Size } from './types';
type ListRendererDatabaseDependency = 'folder.created_time' | 'folder.encryption_applied' | 'folder.encryption_cipher_text' | 'folder.icon' | 'folder.id' | 'folder.is_shared' | 'folder.master_key_id' | 'folder.parent_id' | 'folder.share_id' | 'folder.title' | 'folder.updated_time' | 'folder.user_created_time' | 'folder.user_data' | 'folder.user_updated_time' | 'folder.type_' | 'note.altitude' | 'note.application_data' | 'note.author' | 'note.body' | 'note.conflict_original_id' | 'note.created_time' | 'note.encryption_applied' | 'note.encryption_cipher_text' | 'note.id' | 'note.is_conflict' | 'note.is_shared' | 'note.is_todo' | 'note.latitude' | 'note.longitude' | 'note.markup_language' | 'note.master_key_id' | 'note.order' | 'note.parent_id' | 'note.share_id' | 'note.source' | 'note.source_application' | 'note.source_url' | 'note.title' | 'note.todo_completed' | 'note.todo_due' | 'note.updated_time' | 'note.user_created_time' | 'note.user_data' | 'note.user_updated_time' | 'note.type_';
export declare enum ItemFlow {
    TopToBottom = "topToBottom",
    LeftToRight = "leftToRight"
}
export type RenderNoteView = Record<string, any>;
export interface OnChangeEvent {
    elementId: string;
    value: any;
    noteId: string;
}
export type OnRenderNoteHandler = (props: any) => Promise<RenderNoteView>;
export type OnChangeHandler = (event: OnChangeEvent) => Promise<void>;
/**
 * Most of these are the built-in note properties, such as `note.title`,
 * `note.todo_completed`, etc.
 *
 * Additionally, the `item.*` properties are specific to the rendered item. The
 * most important being `item.selected`, which you can use to display the
 * selected note in a different way.
 *
 * Finally some special properties are provided to make it easier to render
 * notes. In particular, if possible prefer `note.titleHtml` to `note.title`
 * since some important processing has already been done on the string, such as
 * handling the search highlighter and escaping. Since it's HTML and already
 * escaped you would insert it using `{{{titleHtml}}}` (triple-mustache syntax,
 * which disables escaping).
 *
 * `notes.tag` gives you the list of tags associated with the note.
 *
 * `note.isWatched` tells you if the note is currently opened in an external
 * editor. In which case you would generally display some indicator.
 */
export type ListRendererDepependency = ListRendererDatabaseDependency | 'item.size.width' | 'item.size.height' | 'item.selected' | 'note.titleHtml' | 'note.isWatched' | 'note.tags';
export interface ListRenderer {
    /**
     * It must be unique to your plugin.
     */
    id: string;
    /**
     * Can be top to bottom or left to right. Left to right gives you more
     * option to set the size of the items since you set both its width and
     * height.
     */
    flow: ItemFlow;
    /**
     * The size of each item must be specified in advance for performance
     * reasons, and cannot be changed afterwards. If the item flow is top to
     * bottom, you only need to specificy the item height (the width will be
     * ignored).
     */
    itemSize: Size;
    /**
     * The CSS is relative to the list item container. What will appear in the
     * page is essentially `.note-list-item { YOUR_CSS; }`. It means you can use
     * child combinator with guarantee it will only apply to your own items. In
     * this example, the styling will apply to `.note-list-item > .content`:
     *
     * ```css
     * > .content {
     *     padding: 10px;
     * }
     * ```
     *
     * In order to get syntax highlighting working here, it's recommended
     * installing an editor extension such as [es6-string-html VSCode
     * extension](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)
     */
    itemCss?: string;
    /**
     * List the dependencies that your plugin needs to render the note list
     * items. Only these will be passed to your `onRenderNote` handler. Ensure
     * that you do not add more than what you need since there is a performance
     * penalty for each property.
     */
    dependencies: ListRendererDepependency[];
    /**
     * This is the HTML template that will be used to render the note list item.
     * This is a [Mustache template](https://github.com/janl/mustache.js) and it
     * will receive the variable you return from `onRenderNote` as tags. For
     * example, if you return a property named `formattedDate` from
     * `onRenderNote`, you can insert it in the template using `Created date:
     * {{formattedDate}}`.
     *
     * In order to get syntax highlighting working here, it's recommended
     * installing an editor extension such as [es6-string-html VSCode
     * extension](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)
     */
    itemTemplate: string;
    /**
     * This user-facing text is used for example in the View menu, so that your
     * renderer can be selected.
     */
    label: () => Promise<string>;
    /**
     * This is where most of the real-time processing will happen. When a note
     * is rendered for the first time and every time it changes, this handler
     * receives the properties specified in the `dependencies` property. You can
     * then process them, load any additional data you need, and once done you
     * need to return the properties that are needed in the `itemTemplate` HTML.
     * Again, to use the formatted date example, you could have such a renderer:
     *
     * ```typescript
     * dependencies: [
     *     'note.title',
     *     'note.created_time',
     * ],
     *
     * itemTemplate: // html
     *     `
     *     <div>
     *         Title: {{note.title}}<br/>
     *         Date: {{formattedDate}}
     *     </div>
     * `,
     *
     * onRenderNote: async (props: any) => {
     *     const formattedDate = dayjs(props.note.created_time).format();
     *     return {
     *         // Also return the props, so that note.title is available from the
     *         // template
     *         ...props,
     *         formattedDate,
     *     }
     * },
     * ```
     */
    onRenderNote: OnRenderNoteHandler;
    /**
     * This handler allows adding some interacivity to the note renderer -
     * whenever an input element within the item is changed (for example, when a
     * checkbox is clicked, or a text input is changed), this `onChange` handler
     * is going to be called.
     *
     * You can inspect `event.elementId` to know which element had some changes,
     * and `event.value` to know the new value. `event.noteId` also tells you
     * what note is affected, so that you can potentially apply changes to it.
     *
     * You specify the element ID, by setting a `data-id` attribute on the
     * input.
     *
     * For example, if you have such a template:
     *
     * ```html
     * <div>
     *     <input type="text" value="{{note.title}}" data-id="noteTitleInput"/>
     * </div>
     * ```
     *
     * The event handler will receive an event with `elementId` set to
     * `noteTitleInput`.
     */
    onChange?: OnChangeHandler;
}
export {};
