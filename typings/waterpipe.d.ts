declare const waterpipe: Waterpipe;

interface Waterpipe {
    /**
     * Evaluates a waterpipe template.
     */
    (template: string, data?: any, options?: WaterpipeOptions): string;

    /**
     * Evaluates a single waterpipe expression.
     * @returns Result of the expression.
     */
    eval(expression: string, data?: any, options?: WaterpipeOptions): any;

    /**
     * Converts the given value to string using waterpipe's internal conversion.
     * @param value Any value.
     */
    string(value: any): string;

    /**
     * Gets the library version.
     */
    readonly version: string;

    /**
     * Defines global variables readable from all templates.
     */
    readonly globals: WaterpipeGlobal;

    /**
     * Sets default options used when options are not passed for template evaluation
     */
    readonly defaultOptions: WaterpipeOptions;

    /**
     * Defines pipe functions.
     */
    readonly pipes: {
        /**
         * Defines a pipe function callable by the given name.
         */
        [s: string]: Waterpipe.Pipe | Waterpipe.VaridicPipe;

        /**
         * Defines a wildcard pipe function which returns a pipe function based on the given name
         * when pipe function of such name does not exist.
         */
        __default__: ((name: string) => Waterpipe.Pipe | Waterpipe.VaridicPipe | null);
    }
}

interface WaterpipeOptions {
    /**
     * Defines global variables readable in this evaluation.
     */
    globals?: WaterpipeGlobal;

    /**
     * Sets indentation of resulting HTML markup.
     * Each level of nested elements will be indented by the specfied number of spaces or the specific sequence of characters.
     * If either 0 or an empty string is specified, indentation is turned off as if this option is absent.
     */
    indent?: number | string;

    /**
     * Number of spaces or the specific sequence of characters that will be left padded to each line.
     * This option is only effective if the indent option is present and not equal to 0 or an empty string.
     */
    indentPadding?: number | string;

    /**
     * Suppress encoding reserved HTML characters, including ', ", &, < and >.
     * Useful for templated text that contains no HTML and could be escaped later on.
     */
    noEncode?: boolean;

    /**
     * If set to `false`, suppress encoding reserved HTML characters, including ', ", &, < and >,
     * and keep all whitespaces as-is. Default is `true`.
     */
    html?: boolean;

    /**
     * Whether to suppress warning output to console.
     */
    noWarning?: boolean;
}

interface WaterpipeGlobal {
    /**
     * Defines global variable named by the index.
     */
    [s: string]: any;
}

declare namespace Waterpipe {
    /**
     * Defines a simple pipe function which takes the specified number of arguments.
     * @returns Any value which will be treated as the input value of the next pipe function.
     */
    interface Pipe {
        (this: WaterpipeGlobal, value: any, ...args: any[]): any;
    }

    /**
     * Defines a pipe function which does not restrict to default evaluation behavior. 
     */
    interface VaridicPipe {
        /**
         * @this {WaterpipeGlobal} A writable dictionary which contains global variable in the current scope.
         * @param value Current input value.
         * @param varargs An object providing advanced control.
         * @returns Any value which will be treated as the input value of the next pipe function.
         */
        (this: WaterpipeGlobal, value: any, varargs: PipeEvaluator): any;

        /**
         * This flag must be set on the function.
         */
        varargs: true;
    }

    /**
     * Provides advanced control over how the expression is evaluated.
     */
    interface PipeEvaluator {
        /**
         * Contains global variables visible in current scope.
         */
        readonly globals: WaterpipeGlobal;

        /**
         * Evaluates an object path in the current context.
         * @param objectPath 
         */
        eval(objectPath: string): any;

        /**
         * Stops execution of the current expression and returns the current input value.
         */
        stop(): any;

        /**
         * Pushes the specified value to the result array.
         * The result of the current expression will be an flattened array containing all pushed values.
         * @param value A single value or an array of values.
         */
        push(value: any | any[]): any;

        /**
         * Resets the current value to the initial input of the expression.
         */
        reset(): any;

        /**
         * Determines whether there is still arguments in the expression.
         */
        hasArgs(): boolean;

        /**
         * Gets the type of the current token in the expression.
         */
        state(): 'end' | 'func' | 'auto' | 'path' | 'const';

        /**
         * Reads the next argument as plain text appeared in the expression.
         */
        raw(): any;

        /**
         * Reads the next argument.
         * @param preferObject Tells the evaluator whether an implicit argument
         * (neither preceding with $ sign which is always evaluated nor embraced by "" which is always literal) 
         * should be evaluted if the object path resolved to values other than boolean, number or string,
         * when the current input value is not an object.
         */
        next(preferObject?: boolean): any;

        /**
         * Reads a portion of upcoming arguments that conforms a waterpipe lambda expression (embraced by [ ] arguments) as a callable function.
         * @param fallback A fallback function will intakes the next argument if there is no lambda expression.
         * @returns A function which when called, the lambda expression will be evaluated against the input arguments and the result is returned.
         */
        fn(fallback?: (value: any) => any): ((value: any, index: any) => any) | null;
    }
}
