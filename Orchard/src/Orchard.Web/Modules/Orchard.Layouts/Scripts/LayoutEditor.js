angular.module("LayoutEditor", ["ngSanitize", "ngResource", "ui.sortable"]);
var LayoutEditor;
(function(LayoutEditor) {

    var Clipboard = function () {
        var self = this;
        this._clipboardData = {};
        this._isDisabled = false;
        this._wasInvoked = false;

        this.setData = function(contentType, data) {
            self._clipboardData[contentType] = data;
            self._wasInvoked = true;
        };
        this.getData = function (contentType) {
            return self._clipboardData[contentType];
            self._wasInvoked = true;
        };
        this.disable = function() {
            self._isDisabled = true;
            self._wasInvoked = false;
            self._clipboardData = {};
        };
        this.isDisabled = function () {
            return self._isDisabled;
        }
        this.wasInvoked = function () {
            return self._wasInvoked;
        }
    }

    LayoutEditor.Clipboard = new Clipboard();

    angular
        .module("LayoutEditor")
        .factory("clipboard", [
            function() {
                return {
                    setData: LayoutEditor.Clipboard.setData,
                    getData: LayoutEditor.Clipboard.getData,
                    disable: LayoutEditor.Clipboard.disable,
                    isDisabled: LayoutEditor.Clipboard.isDisabled,
                    wasInvoked: LayoutEditor.Clipboard.wasInvoked
                };
            }
        ]);
})(LayoutEditor || (LayoutEditor = {}));
angular
    .module("LayoutEditor")
    .factory("scopeConfigurator", ["$timeout", "clipboard",
        function ($timeout, clipboard) {
            return {

                configureForElement: function ($scope, $element) {
                
                    $element.find(".layout-panel").click(function (e) {
                        e.stopPropagation();
                    });

                    $element.parent().keydown(function (e) {
                        var handled = false;
                        var resetFocus = false;
                        var element = $scope.element;
                    
                        if (element.editor.isDragging || element.editor.inlineEditingIsActive)
                            return;

                        // If native clipboard support exists, the pseudo-clipboard will have been disabled.
                        if (!clipboard.isDisabled()) {
                            var focusedElement = element.editor.focusedElement;
                            if (!!focusedElement) {
                                // Pseudo clipboard handling for browsers not allowing real clipboard operations.
                                if (e.ctrlKey) {
                                    switch (e.which) {
                                    case 67: // C
                                        focusedElement.copy(clipboard);
                                        break;
                                    case 88: // X
                                        focusedElement.cut(clipboard);
                                        break;
                                    case 86: // V
                                        focusedElement.paste(clipboard);
                                        break;
                                    }
                                }
                            }
                        }

                        if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 46) { // Del
                            $scope.delete(element);
                            handled = true;
                        } else if (!e.ctrlKey && !e.shiftKey && !e.altKey && (e.which == 32 || e.which == 27)) { // Space or Esc
                            $element.find(".layout-panel-action-properties").first().click();
                            handled = true;
                        }

                        if (element.type == "Content") { // This is a content element.
                            if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 13) { // Enter
                                $element.find(".layout-panel-action-edit").first().click();
                                handled = true;
                            }
                        }

                        if (!!element.children) { // This is a container.
                            if (!e.ctrlKey && !e.shiftKey && e.altKey && e.which == 40) { // Alt+Down
                                if (element.children.length > 0)
                                    element.children[0].setIsFocused();
                                handled = true;
                            }

                            if (element.type == "Column") { // This is a column.
                                var connectAdjacent = !e.ctrlKey;
                                if (e.which == 37) { // Left
                                    if (e.altKey)
                                        element.expandLeft(connectAdjacent);
                                    if (e.shiftKey)
                                        element.contractRight(connectAdjacent);
                                    handled = true;
                                } else if (e.which == 39) { // Right
                                    if (e.altKey)
                                        element.contractLeft(connectAdjacent);
                                    if (e.shiftKey)
                                        element.expandRight(connectAdjacent);
                                    handled = true;
                                }
                            }
                        }

                        if (!!element.parent) { // This is a child.
                            if (e.altKey && e.which == 38) { // Alt+Up
                                element.parent.setIsFocused();
                                handled = true;
                            }

                            if (element.parent.type == "Row") { // Parent is a horizontal container.
                                if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 37) { // Left
                                    element.parent.moveFocusPrevChild(element);
                                    handled = true;
                                }
                                else if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 39) { // Right
                                    element.parent.moveFocusNextChild(element);
                                    handled = true;
                                }
                                else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 37) { // Ctrl+Left
                                    element.moveUp();
                                    resetFocus = true;
                                    handled = true;
                                }
                                else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 39) { // Ctrl+Right
                                    element.moveDown();
                                    handled = true;
                                }
                            }
                            else { // Parent is a vertical container.
                                if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 38) { // Up
                                    element.parent.moveFocusPrevChild(element);
                                    handled = true;
                                }
                                else if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 40) { // Down
                                    element.parent.moveFocusNextChild(element);
                                    handled = true;
                                }
                                else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 38) { // Ctrl+Up
                                    element.moveUp();
                                    resetFocus = true;
                                    handled = true;
                                }
                                else if (e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 40) { // Ctrl+Down
                                    element.moveDown();
                                    handled = true;
                                }
                            }
                        }

                        if (handled) {
                            e.preventDefault();
                        }

                        e.stopPropagation();

                        $scope.$apply(); // Event is not triggered by Angular directive but raw event handler on element.

                        // HACK: Workaround because of how Angular treats the DOM when elements are shifted around - input focus is sometimes lost.
                        if (resetFocus) {
                            window.setTimeout(function () {
                                $scope.$apply(function () {
                                    element.editor.focusedElement.setIsFocused();
                                });
                            }, 100);
                        }
                    });

                    $scope.element.setIsFocusedEventHandlers.push(function () {
                        $element.parent().focus();
                    });

                    $scope.delete = function (element) {
                        element.delete();
                    }
                },

                configureForContainer: function ($scope, $element) {
                    var element = $scope.element;

                    //$scope.isReceiving = false; // True when container is receiving an external element via drag/drop.
                    $scope.getShowChildrenPlaceholder = function () {
                        return $scope.element.children.length === 0 && !$scope.element.getIsDropTarget();
                    };

                    $scope.sortableOptions = {
                        cursor: "move",
                        delay: 150,
                        disabled: element.getIsSealed(),
                        distance: 5,
                        //handle: element.children.length < 2 ? ".imaginary-class" : false, // For some reason doesn't get re-evaluated after adding more children.
                        start: function (e, ui) {
                            $scope.$apply(function () {
                                element.setIsDropTarget(true);
                                element.editor.isDragging = true;
                            });
                            // Make the drop target placeholder as high as the item being dragged.
                            ui.placeholder.height(ui.item.height() - 4);
                            ui.placeholder.css("min-height", 0);
                        },
                        stop: function (e, ui) {
                            $scope.$apply(function () {
                                element.editor.isDragging = false;
                                element.setIsDropTarget(false);
                            });
                        },
                        over: function (e, ui) {
                            if (!!ui.sender && !!ui.sender[0].isToolbox) {
                                if (!!ui.sender[0].dropTargetTimeout) {
                                    $timeout.cancel(ui.sender[0].dropTargetTimeout);
                                    ui.sender[0].dropTargetTimeout = null;
                                }
                                $timeout(function () {
                                    if (element.type == "Row") {
                                        // If there was a previous drop target and it was a row, roll back any pending column adds to it.
                                        var previousDropTarget = element.editor.dropTargetElement;
                                        if (!!previousDropTarget && previousDropTarget.type == "Row")
                                            previousDropTarget.rollbackAddColumn();
                                    }
                                    element.setIsDropTarget(false);
                                });
                                ui.sender[0].dropTargetTimeout = $timeout(function () {
                                    if (element.type == "Row") {
                                        var receivedColumn = ui.item.sortable.model;
                                        var receivedColumnWidth = Math.floor(12 / (element.children.length + 1));
                                        receivedColumn.width = receivedColumnWidth;
                                        receivedColumn.offset = 0;
                                        element.beginAddColumn(receivedColumnWidth);
                                        // Make the drop target placeholder the correct width and as high as the highest existing column in the row.
                                        var maxHeight = _.max(_($element.find("> .layout-children > .layout-column:not(.ui-sortable-placeholder)")).map(function (e) {
                                            return $(e).height();
                                        }));
                                        for (i = 1; i <= 12; i++)
                                            ui.placeholder.removeClass("col-xs-" + i);
                                        ui.placeholder.addClass("col-xs-" + receivedColumn.width);
                                        if (maxHeight > 0) {
                                            ui.placeholder.height(maxHeight);
                                            ui.placeholder.css("min-height", 0);
                                        }
                                        else {
                                            ui.placeholder.height(0);
                                            ui.placeholder.css("min-height", "");
                                        }
                                    }
                                    element.setIsDropTarget(true);
                                }, 150);
                            }
                        },
                        receive: function (e, ui) {
                            if (!!ui.sender && !!ui.sender[0].isToolbox) {
                                $scope.$apply(function () {
                                    var receivedElement = ui.item.sortable.model;
                                    if (!!receivedElement) {
                                        if (element.type == "Row")
                                            element.commitAddColumn();
                                        // Should ideally call LayoutEditor.Container.addChild() instead, but since this handler
                                        // is run *before* the ui-sortable directive's handler, if we try to add the child to the
                                        // array that handler will get an exception when trying to do the same.
                                        // Because of this, we need to invoke "setParent" so that specific container types can perform element speficic initialization.
                                        receivedElement.setEditor(element.editor);
                                        receivedElement.setParent(element);
                                        if (!!receivedElement.hasEditor) {
                                            $scope.$root.editElement(receivedElement).then(function (args) {
                                                if (!args.cancel) {
                                                    receivedElement.data = args.element.data;

                                                    if (receivedElement.setHtml)
                                                        receivedElement.setHtml(args.element.html);
                                                }
                                                $timeout(function () {
                                                    if (!!args.cancel)
                                                        receivedElement.delete();
                                                    else
                                                        receivedElement.setIsFocused();
                                                    //$scope.isReceiving = false;
                                                    element.setIsDropTarget(false);

                                                });
                                                return;
                                            });
                                        }
                                    }
                                    $timeout(function () {
                                        //$scope.isReceiving = false;
                                        element.setIsDropTarget(false);
                                        if (!!receivedElement)
                                            receivedElement.setIsFocused();
                                    });
                                });
                            }
                        }
                    };

                    $scope.click = function (child, e) {
                        if (!child.editor.isDragging)
                            child.setIsFocused();
                        e.stopPropagation();
                    };

                    $scope.getClasses = function (child) {
                        var result = ["layout-element"];

                        if (!!child.children) {
                            result.push("layout-container");
                            if (child.getIsSealed())
                                result.push("layout-container-sealed");
                        }

                        result.push("layout-" + child.type.toLowerCase());

                        if (!!child.dropTargetClass)
                            result.push(child.dropTargetClass);

                        // TODO: Move these to either the Column directive or the Column model class.
                        if (child.type == "Row") {
                            result.push("row");
                            if (!child.canAddColumn())
                                result.push("layout-row-full");
                        }
                        if (child.type == "Column") {
                            result.push("col-xs-" + child.width);
                            result.push("col-xs-offset-" + child.offset);
                        }
                        if (child.type == "Content")
                            result.push("layout-content-" + child.contentTypeClass);

                        if (child.getIsActive())
                            result.push("layout-element-active");
                        if (child.getIsFocused())
                            result.push("layout-element-focused");
                        if (child.getIsSelected())
                            result.push("layout-element-selected");
                        if (child.getIsDropTarget())
                            result.push("layout-element-droptarget");
                        if (child.isTemplated)
                            result.push("layout-element-templated");

                        return result;
                    };
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutEditor", ["environment",
        function (environment) {
            return {
                restrict: "E",
                scope: {},
                controller: ["$scope", "$element", "$attrs", "$compile", "clipboard",
                    function ($scope, $element, $attrs, $compile, clipboard) {
                        if (!!$attrs.model)
                            $scope.element = eval($attrs.model);
                        else
                            throw new Error("The 'model' attribute must evaluate to a LayoutEditor.Editor object.");

                        $scope.click = function (canvas, e) {
                            if (!canvas.editor.isDragging)
                                canvas.setIsFocused();
                            e.stopPropagation();
                        };

                        $scope.getClasses = function (canvas) {
                            var result = ["layout-element", "layout-container", "layout-canvas"];

                            if (canvas.getIsActive())
                                result.push("layout-element-active");
                            if (canvas.getIsFocused())
                                result.push("layout-element-focused");
                            if (canvas.getIsSelected())
                                result.push("layout-element-selected");
                            if (canvas.getIsDropTarget())
                                result.push("layout-element-droptarget");
                            if (canvas.isTemplated)
                                result.push("layout-element-templated");

                            return result;
                        };

                        // An unfortunate side-effect of the next hack on line 54 is that the created elements aren't added to the DOM yet, so we can't use it to get to the parent ".layout-desiger" element.
                        // Work around: access that element directly (which efectively turns multiple layout editors on a single page impossible). 
                        // //var layoutDesignerHost = $element.closest(".layout-designer").data("layout-designer-host");
                        var layoutDesignerHost = $(".layout-designer").data("layout-designer-host");

                        $scope.$root.layoutDesignerHost = layoutDesignerHost;

                        layoutDesignerHost.element.on("replacecanvas", function (e, args) {
                            var editor = $scope.element;
                            var canvasData = {
                                data: args.canvas.data,
                                htmlId: args.canvas.htmlId,
                                htmlClass: args.canvas.htmlClass,
                                htmlStyle: args.canvas.htmlStyle,
                                isTemplated: args.canvas.isTemplated,
                                children: args.canvas.children
                            };

                            // HACK: Instead of simply updating the $scope.element with a new instance, we need to replace the entire orc-layout-editor markup
                            // in order for angular to rebind starting with the Canvas element. Otherwise, for some reason, it will rebind starting with the first child of Canvas.
                            // You can see this happening when setting a breakpoint in ScopeConfigurator where containers are initialized with drag & drop: on page load, the first element
                            // is a Canvas (good), but after having selected another template, the first element is (typically) a Grid (bad).
                            // Simply recompiling the orc-layout-editor directive will cause the entire thing to be generated, which works just fine as well (even though not is nice as simply leveraging model binding).
                            layoutDesignerHost.editor = window.layoutEditor = new LayoutEditor.Editor(editor.config, canvasData);
                            var template = "<orc-layout-editor" + " model='window.layoutEditor' />";
                            var html = $compile(template)($scope);
                            $(".layout-editor-holder").html(html);
                        });

                        $scope.$root.editElement = function (element) {
                            var host = $scope.$root.layoutDesignerHost;
                            return host.editElement(element);
                        };

                        $scope.$root.addElement = function (contentType) {
                            var host = $scope.$root.layoutDesignerHost;
                            return host.addElement(contentType);
                        };

                        $scope.toggleInlineEditing = function () {
                            if (!$scope.element.inlineEditingIsActive) {
                                $scope.element.inlineEditingIsActive = true;
                                $element.find(".layout-toolbar-container").show();
                                var selector = "#layout-editor-" + $scope.$id + " .layout-html .layout-content-markup[data-templated=false]";
                                var firstContentEditorId = $(selector).first().attr("id");
                                tinymce.init({
                                    selector: selector,
                                    theme: "modern",
                                    schema: "html5",
                                    plugins: [
                                        "advlist autolink lists link image charmap print preview hr anchor pagebreak",
                                        "searchreplace wordcount visualblocks visualchars code fullscreen",
                                        "insertdatetime media nonbreaking table contextmenu directionality",
                                        "emoticons template paste textcolor colorpicker textpattern",
                                        "fullscreen autoresize"
                                    ],
                                    toolbar: "undo redo cut copy paste | bold italic | bullist numlist outdent indent formatselect | alignleft aligncenter alignright alignjustify ltr rtl | link unlink charmap | code fullscreen close",
                                    convert_urls: false,
                                    valid_elements: "*[*]",
                                    // Shouldn't be needed due to the valid_elements setting, but TinyMCE would strip script.src without it.
                                    extended_valid_elements: "script[type|defer|src|language]",
                                    statusbar: false,
                                    skin: "orchardlightgray",
                                    inline: true,
                                    fixed_toolbar_container: "#layout-editor-" + $scope.$id + " .layout-toolbar-container",
                                    init_instance_callback: function (editor) {
                                        if (editor.id == firstContentEditorId)
                                            tinymce.execCommand("mceFocus", false, editor.id);
                                    }
                                });
                            }
                            else {
                                tinymce.remove("#layout-editor-" + $scope.$id + " .layout-content-markup");
                                $element.find(".layout-toolbar-container").hide();
                                $scope.element.inlineEditingIsActive = false;
                            }
                        };

                        $(document).on("cut copy paste", function (e) {
                            // If the pseudo clipboard was already invoked (which happens on the first clipboard
                            // operation after page load even if native clipboard support exists) then sit this
                            // one operation out, but make sure whatever is on the pseudo clipboard gets migrated
                            // to the native clipboard for subsequent operations.
                            if (clipboard.wasInvoked()) {
                                e.originalEvent.clipboardData.setData("text/plain", clipboard.getData("text/plain"));
                                e.originalEvent.clipboardData.setData("text/json", clipboard.getData("text/json"));
                                e.preventDefault();
                            }
                            else {
                                var focusedElement = $scope.element.focusedElement;
                                if (!!focusedElement) {
                                    $scope.$apply(function () {
                                        switch (e.type) {
                                            case "copy":
                                                focusedElement.copy(e.originalEvent.clipboardData);
                                                break;
                                            case "cut":
                                                focusedElement.cut(e.originalEvent.clipboardData);
                                                break;
                                            case "paste":
                                                focusedElement.paste(e.originalEvent.clipboardData);
                                                break;
                                        }
                                    });

                                    // HACK: Workaround because of how Angular treats the DOM when elements are shifted around - input focus is sometimes lost.
                                    window.setTimeout(function () {
                                        $scope.$apply(function () {
                                            if (!!$scope.element.focusedElement)
                                                $scope.element.focusedElement.setIsFocused();
                                        });
                                    }, 100);

                                    e.preventDefault();
                                }
                            }

                            // Native clipboard support obviously exists, so disable the peudo clipboard from now on.
                            clipboard.disable();
                        });
                    }
                ],
                templateUrl: environment.templateUrl("Editor"),
                replace: true,
                link: function (scope, element) {
                    // No clicks should propagate from the TinyMCE toolbars.
                    element.find(".layout-toolbar-container").click(function (e) {
                        e.stopPropagation();
                    });
                    // Intercept mousedown on editor while in inline editing mode to 
                    // prevent current editor from losing focus.
                    element.mousedown(function (e) {
                        if (scope.element.inlineEditingIsActive) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    })
                    // Unfocus and unselect everything on click outside of canvas.
                    $(window).click(function (e) {
                        // Except when in inline editing mode.
                        if (!scope.element.inlineEditingIsActive) {
                            scope.$apply(function () {
                                scope.element.activeElement = null;
                                scope.element.focusedElement = null;
                            });
                        }
                    });
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutCanvas", ["scopeConfigurator", "environment",
        function (scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element", "$attrs",
                    function ($scope, $element, $attrs) {
                        scopeConfigurator.configureForElement($scope, $element);
                        scopeConfigurator.configureForContainer($scope, $element);
                        $scope.sortableOptions["axis"] = "y";
                    }
                ],
                templateUrl: environment.templateUrl("Canvas"),
                replace: true
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutChild", ["$compile",
        function ($compile) {
            return {
                restrict: "E",
                scope: { element: "=" },
                link: function (scope, element) {
                    var template = "<orc-layout-" + scope.element.type.toLowerCase() + " element='element' />";
                    var html = $compile(template)(scope);
                    $(element).replaceWith(html);
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutColumn", ["$compile", "scopeConfigurator", "environment",
        function ($compile, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        scopeConfigurator.configureForContainer($scope, $element);
                        $scope.sortableOptions["axis"] = "y";
                    }
                ],
                templateUrl: environment.templateUrl("Column"),
                replace: true,
                link: function (scope, element, attrs) {
                    element.find(".layout-column-resize-bar").draggable({
                        axis: "x",
                        helper: "clone",
                        revert: true,
                        start: function (e, ui) {
                            scope.$apply(function () {
                                scope.element.editor.isResizing = true;
                            });
                        },
                        drag: function (e, ui) {
                            var columnElement = element.parent();
                            var columnSize = columnElement.width() / scope.element.width;
                            var connectAdjacent = !e.ctrlKey;
                            if ($(e.target).hasClass("layout-column-resize-bar-left")) {
                                var delta = ui.offset.left - columnElement.offset().left;
                                if (delta < -columnSize && scope.element.canExpandLeft(connectAdjacent)) {
                                    scope.$apply(function () {
                                        scope.element.expandLeft(connectAdjacent);
                                    });
                                }
                                else if (delta > columnSize && scope.element.canContractLeft(connectAdjacent)) {
                                    scope.$apply(function () {
                                        scope.element.contractLeft(connectAdjacent);
                                    });
                                }
                            }
                            else if ($(e.target).hasClass("layout-column-resize-bar-right")) {
                                var delta = ui.offset.left - columnElement.width() - columnElement.offset().left;
                                if (delta > columnSize && scope.element.canExpandRight(connectAdjacent)) {
                                    scope.$apply(function () {
                                        scope.element.expandRight(connectAdjacent);
                                    });
                                }
                                else if (delta < -columnSize && scope.element.canContractRight(connectAdjacent)) {
                                    scope.$apply(function () {
                                        scope.element.contractRight(connectAdjacent);
                                    });
                                }
                            }

                        },
                        stop: function (e, ui) {
                            scope.$apply(function () {
                              scope.element.editor.isResizing = false;
                            });
                        }
                    });
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutContent", ["$sce", "scopeConfigurator", "environment",
        function ($sce, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        $scope.edit = function () {
                            $scope.$root.editElement($scope.element).then(function (args) {
                                $scope.$apply(function () {
                                    if (args.cancel)
                                        return;

                                    $scope.element.data = args.element.data;
                                    $scope.element.setHtml(args.element.html);
                                });
                            });
                        };

                        // Overwrite the setHtml function so that we can use the $sce service to trust the html (and not have the html binding strip certain tags).
                        $scope.element.setHtml = function (html) {
                            $scope.element.html = html;
                            $scope.element.htmlUnsafe = $sce.trustAsHtml(html);
                        };

                        $scope.element.setHtml($scope.element.html);
                    }
                ],
                templateUrl: environment.templateUrl("Content"),
                replace: true
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutHtml", ["$sce", "scopeConfigurator", "environment",
        function ($sce, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        $scope.edit = function () {
                            $scope.$root.editElement($scope.element).then(function (args) {
                                $scope.$apply(function () {
                                    if (args.cancel)
                                        return;

                                    $scope.element.data = args.element.data;
                                    $scope.element.setHtml(args.element.html);
                                });
                            });
                        };
                        $scope.updateContent = function (e) {
                            $scope.element.setHtml(e.target.innerHTML);
                        };

                        // Overwrite the setHtml function so that we can use the $sce service to trust the html (and not have the html binding strip certain tags).
                        $scope.element.setHtml = function (html) {
                            $scope.element.html = html;
                            $scope.element.htmlUnsafe = $sce.trustAsHtml(html);
                        };

                        $scope.element.setHtml($scope.element.html);
                    }
                ],
                templateUrl: environment.templateUrl("Html"),
                replace: true,
                link: function (scope, element) {
                    // Mouse down events must not be intercepted by drag and drop while inline editing is active,
                    // otherwise clicks in inline editors will have no effect.
                    element.find(".layout-content-markup").mousedown(function (e) {
                        if (scope.element.editor.inlineEditingIsActive) {
                            e.stopPropagation();
                        }
                    });
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutGrid", ["$compile", "scopeConfigurator", "environment",
        function ($compile, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        scopeConfigurator.configureForContainer($scope, $element);
                        $scope.sortableOptions["axis"] = "y";
                    }
                ],
                templateUrl: environment.templateUrl("Grid"),
                replace: true
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutRow", ["$compile", "scopeConfigurator", "environment",
        function ($compile, scopeConfigurator, environment) {
            return {
                restrict: "E",
                scope: { element: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        scopeConfigurator.configureForElement($scope, $element);
                        scopeConfigurator.configureForContainer($scope, $element);
                        $scope.sortableOptions["axis"] = "x";
                        $scope.sortableOptions["ui-floating"] = true;
                    }
                ],
                templateUrl: environment.templateUrl("Row"),
                replace: true
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutPopup", [
        function () {
            return {
                restrict: "A",
                link: function (scope, element, attrs) {
                    var popup = $(element);
                    var trigger = popup.closest(".layout-popup-trigger");
                    var parentElement = popup.closest(".layout-element");
                    trigger.click(function () {
                        popup.toggle();
                        if (popup.is(":visible")) {
                            popup.position({
                                my: attrs.orcLayoutPopupMy || "left top",
                                at: attrs.orcLayoutPopupAt || "left bottom+4px",
                                of: trigger
                            });
                            popup.find("input").first().focus();
                        }
                    });
                    popup.click(function (e) {
                        e.stopPropagation();
                    });
                    parentElement.click(function (e) {
                        popup.hide();
                    });
                    popup.keydown(function (e) {
                        if (!e.ctrlKey && !e.shiftKey && !e.altKey && e.which == 27) // Esc
                            popup.hide();
                        e.stopPropagation();
                    });
                    popup.on("cut copy paste", function (e) {
                        // Allow clipboard operations in popup without invoking clipboard event handlers on parent element.
                        e.stopPropagation();
                    });
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutToolbox", ["$compile", "environment",
        function ($compile, environment) {
            return {
                restrict: "E",
                controller: ["$scope", "$element",
                    function ($scope, $element) {

                        $scope.resetElements = function () {

                            $scope.gridElements = [
                                LayoutEditor.Grid.from({
                                    toolboxIcon: "\uf00a",
                                    toolboxLabel: "Grid",
                                    toolboxDescription: "Empty grid.",
                                    children: []
                                })
                            ];

                            $scope.rowElements = [
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (1 column)",
                                    toolboxDescription: "Row with 1 column.",
                                    children: LayoutEditor.Column.times(1)
                                }),
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (2 columns)",
                                    toolboxDescription: "Row with 2 columns.",
                                    children: LayoutEditor.Column.times(2)
                                }),
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (3 columns)",
                                    toolboxDescription: "Row with 3 columns.",
                                    children: LayoutEditor.Column.times(3)
                                }),
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (4 columns)",
                                    toolboxDescription: "Row with 4 columns.",
                                    children: LayoutEditor.Column.times(4)
                                }),
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (6 columns)",
                                    toolboxDescription: "Row with 6 columns.",
                                    children: LayoutEditor.Column.times(6)
                                }),
                                LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (12 columns)",
                                    toolboxDescription: "Row with 12 columns.",
                                    children: LayoutEditor.Column.times(12)
                                }), LayoutEditor.Row.from({
                                    toolboxIcon: "\uf0c9",
                                    toolboxLabel: "Row (empty)",
                                    toolboxDescription: "Empty row.",
                                    children: []
                                })
                            ];

                            $scope.columnElements = [
                                LayoutEditor.Column.from({
                                    toolboxIcon: "\uf0db",
                                    toolboxLabel: "Column",
                                    toolboxDescription: "Empty column.",
                                    width: 1,
                                    offset: 0,
                                    children: []
                                })
                            ];

                            $scope.contentElementCategories = _($scope.element.config.categories).map(function (category) {
                                return {
                                    name: category.name,
                                    elements: _(category.contentTypes).map(function (contentType) {
                                        var type = contentType.type;
                                        var factory = LayoutEditor.factories[type] || LayoutEditor.factories["Content"];
                                        var item = {
                                            isTemplated: false,
                                            contentType: contentType.id,
                                            contentTypeLabel: contentType.label,
                                            contentTypeClass: contentType.typeClass,
                                            data: null,
                                            hasEditor: contentType.hasEditor,
                                            html: contentType.html
                                        };
                                        var element = factory(item);
                                        element.toolboxIcon = contentType.icon || "\uf1c9";
                                        element.toolboxLabel = contentType.label;
                                        element.toolboxDescription = contentType.description;
                                        return element;
                                    })
                                };
                            });

                        };

                        $scope.resetElements();

                        $scope.getSortableOptions = function (type) {
                            var editorId = $element.closest(".layout-editor").attr("id");
                            var parentClasses;
                            var placeholderClasses;
                            var floating = false;

                            switch (type) {
                                case "Grid":
                                    parentClasses = [".layout-canvas", ".layout-column", ".layout-common-holder"];
                                    placeholderClasses = "layout-element layout-container layout-grid ui-sortable-placeholder";
                                    break;
                                case "Row":
                                    parentClasses = [".layout-grid"];
                                    placeholderClasses = "layout-element layout-container layout-row row ui-sortable-placeholder";
                                    break;
                                case "Column":
                                    parentClasses = [".layout-row:not(.layout-row-full)"];
                                    placeholderClasses = "layout-element layout-container layout-column ui-sortable-placeholder";
                                    floating = true; // To ensure a smooth horizontal-list reordering. https://github.com/angular-ui/ui-sortable#floating
                                    break;
                                case "Content":
                                    parentClasses = [".layout-canvas", ".layout-column", ".layout-common-holder"];
                                    placeholderClasses = "layout-element layout-content ui-sortable-placeholder";
                                    break;
                            }

                            return {
                                cursor: "move",
                                connectWith: _(parentClasses).map(function (e) { return "#" + editorId + " " + e + ":not(.layout-container-sealed) > .layout-element-wrapper > .layout-children"; }).join(", "),
                                placeholder: placeholderClasses,
                                "ui-floating": floating,
                                create: function (e, ui) {
                                    e.target.isToolbox = true; // Will indicate to connected sortables that dropped items were sent from toolbox.
                                },
                                start: function (e, ui) {
                                    $scope.$apply(function () {
                                        $scope.element.isDragging = true;
                                    });
                                },
                                stop: function (e, ui) {
                                    $scope.$apply(function () {
                                        $scope.element.isDragging = false;
                                        $scope.resetElements();
                                    });
                                },
                                over: function (e, ui) {
                                    $scope.$apply(function () {
                                        $scope.element.canvas.setIsDropTarget(false);
                                    });
                                },
                            }
                        };

                        var layoutIsCollapsedCookieName = "layoutToolboxCategory_Layout_IsCollapsed";
                        $scope.layoutIsCollapsed = $.cookie(layoutIsCollapsedCookieName) === "true";

                        $scope.toggleLayoutIsCollapsed = function (e) {
                            $scope.layoutIsCollapsed = !$scope.layoutIsCollapsed;
                            $.cookie(layoutIsCollapsedCookieName, $scope.layoutIsCollapsed, { expires: 365 }); // Remember collapsed state for a year.
                            e.preventDefault();
                            e.stopPropagation();
                        };
                    }
                ],
                templateUrl: environment.templateUrl("Toolbox"),
                replace: true,
                link: function (scope, element) {
                    var toolbox = element.find(".layout-toolbox");
                    $(window).on("resize scroll", function (e) {
                        var canvas = element.parent().find(".layout-canvas");
                        // If the canvas is taller than the toolbox, make the toolbox sticky-positioned within the editor
                        // to help the user avoid excessive vertical scrolling.
                        var canvasIsTaller = !!canvas && canvas.height() > toolbox.height();
                        var windowPos = $(window).scrollTop();
                        if (canvasIsTaller && windowPos > element.offset().top + element.height() - toolbox.height()) {
                            toolbox.addClass("sticky-bottom");
                            toolbox.removeClass("sticky-top");
                        }
                        else if (canvasIsTaller && windowPos > element.offset().top) {
                            toolbox.addClass("sticky-top");
                            toolbox.removeClass("sticky-bottom");
                        }
                        else {
                            toolbox.removeClass("sticky-top");
                            toolbox.removeClass("sticky-bottom");
                        }
                    });
                }
            };
        }
    ]);
angular
    .module("LayoutEditor")
    .directive("orcLayoutToolboxGroup", ["$compile", "environment",
        function ($compile, environment) {
            return {
                restrict: "E",
                scope: { category: "=" },
                controller: ["$scope", "$element",
                    function ($scope, $element) {
                        var isCollapsedCookieName = "layoutToolboxCategory_" + $scope.category.name + "_IsCollapsed";
                        $scope.isCollapsed = $.cookie(isCollapsedCookieName) === "true";
                        $scope.toggleIsCollapsed = function (e) {
                            $scope.isCollapsed = !$scope.isCollapsed;
                            $.cookie(isCollapsedCookieName, $scope.isCollapsed, { expires: 365 }); // Remember collapsed state for a year.
                            e.preventDefault();
                            e.stopPropagation();
                        };
                    }
                ],
                templateUrl: environment.templateUrl("ToolboxGroup"),
                replace: true
            };
        }
    ]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIk1vZHVsZS5qcyIsIkNsaXBib2FyZC5qcyIsIlNjb3BlQ29uZmlndXJhdG9yLmpzIiwiRWRpdG9yLmpzIiwiQ2FudmFzLmpzIiwiQ2hpbGQuanMiLCJDb2x1bW4uanMiLCJDb250ZW50LmpzIiwiSHRtbC5qcyIsIkdyaWQuanMiLCJSb3cuanMiLCJQb3B1cC5qcyIsIlRvb2xib3guanMiLCJUb29sYm94R3JvdXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiTGF5b3V0RWRpdG9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoXCJMYXlvdXRFZGl0b3JcIiwgW1wibmdTYW5pdGl6ZVwiLCBcIm5nUmVzb3VyY2VcIiwgXCJ1aS5zb3J0YWJsZVwiXSk7IiwidmFyIExheW91dEVkaXRvcjtcbihmdW5jdGlvbihMYXlvdXRFZGl0b3IpIHtcblxuICAgIHZhciBDbGlwYm9hcmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy5fY2xpcGJvYXJkRGF0YSA9IHt9O1xuICAgICAgICB0aGlzLl9pc0Rpc2FibGVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX3dhc0ludm9rZWQgPSBmYWxzZTtcblxuICAgICAgICB0aGlzLnNldERhdGEgPSBmdW5jdGlvbihjb250ZW50VHlwZSwgZGF0YSkge1xuICAgICAgICAgICAgc2VsZi5fY2xpcGJvYXJkRGF0YVtjb250ZW50VHlwZV0gPSBkYXRhO1xuICAgICAgICAgICAgc2VsZi5fd2FzSW52b2tlZCA9IHRydWU7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZ2V0RGF0YSA9IGZ1bmN0aW9uIChjb250ZW50VHlwZSkge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYuX2NsaXBib2FyZERhdGFbY29udGVudFR5cGVdO1xuICAgICAgICAgICAgc2VsZi5fd2FzSW52b2tlZCA9IHRydWU7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZGlzYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc2VsZi5faXNEaXNhYmxlZCA9IHRydWU7XG4gICAgICAgICAgICBzZWxmLl93YXNJbnZva2VkID0gZmFsc2U7XG4gICAgICAgICAgICBzZWxmLl9jbGlwYm9hcmREYXRhID0ge307XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuaXNEaXNhYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLl9pc0Rpc2FibGVkO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMud2FzSW52b2tlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLl93YXNJbnZva2VkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgTGF5b3V0RWRpdG9yLkNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmQoKTtcblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxuICAgICAgICAuZmFjdG9yeShcImNsaXBib2FyZFwiLCBbXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzZXREYXRhOiBMYXlvdXRFZGl0b3IuQ2xpcGJvYXJkLnNldERhdGEsXG4gICAgICAgICAgICAgICAgICAgIGdldERhdGE6IExheW91dEVkaXRvci5DbGlwYm9hcmQuZ2V0RGF0YSxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZTogTGF5b3V0RWRpdG9yLkNsaXBib2FyZC5kaXNhYmxlLFxuICAgICAgICAgICAgICAgICAgICBpc0Rpc2FibGVkOiBMYXlvdXRFZGl0b3IuQ2xpcGJvYXJkLmlzRGlzYWJsZWQsXG4gICAgICAgICAgICAgICAgICAgIHdhc0ludm9rZWQ6IExheW91dEVkaXRvci5DbGlwYm9hcmQud2FzSW52b2tlZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xufSkoTGF5b3V0RWRpdG9yIHx8IChMYXlvdXRFZGl0b3IgPSB7fSkpOyIsImFuZ3VsYXJcbiAgICAubW9kdWxlKFwiTGF5b3V0RWRpdG9yXCIpXG4gICAgLmZhY3RvcnkoXCJzY29wZUNvbmZpZ3VyYXRvclwiLCBbXCIkdGltZW91dFwiLCBcImNsaXBib2FyZFwiLFxuICAgICAgICBmdW5jdGlvbiAoJHRpbWVvdXQsIGNsaXBib2FyZCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcblxuICAgICAgICAgICAgICAgIGNvbmZpZ3VyZUZvckVsZW1lbnQ6IGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICRlbGVtZW50LmZpbmQoXCIubGF5b3V0LXBhbmVsXCIpLmNsaWNrKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoKS5rZXlkb3duKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc2V0Rm9jdXMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlbGVtZW50ID0gJHNjb3BlLmVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuZWRpdG9yLmlzRHJhZ2dpbmcgfHwgZWxlbWVudC5lZGl0b3IuaW5saW5lRWRpdGluZ0lzQWN0aXZlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgbmF0aXZlIGNsaXBib2FyZCBzdXBwb3J0IGV4aXN0cywgdGhlIHBzZXVkby1jbGlwYm9hcmQgd2lsbCBoYXZlIGJlZW4gZGlzYWJsZWQuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNsaXBib2FyZC5pc0Rpc2FibGVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZm9jdXNlZEVsZW1lbnQgPSBlbGVtZW50LmVkaXRvci5mb2N1c2VkRWxlbWVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFmb2N1c2VkRWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQc2V1ZG8gY2xpcGJvYXJkIGhhbmRsaW5nIGZvciBicm93c2VycyBub3QgYWxsb3dpbmcgcmVhbCBjbGlwYm9hcmQgb3BlcmF0aW9ucy5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUuY3RybEtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChlLndoaWNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDY3OiAvLyBDXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9jdXNlZEVsZW1lbnQuY29weShjbGlwYm9hcmQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA4ODogLy8gWFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzZWRFbGVtZW50LmN1dChjbGlwYm9hcmQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSA4NjogLy8gVlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzZWRFbGVtZW50LnBhc3RlKGNsaXBib2FyZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZS5jdHJsS2V5ICYmICFlLnNoaWZ0S2V5ICYmICFlLmFsdEtleSAmJiBlLndoaWNoID09IDQ2KSB7IC8vIERlbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5kZWxldGUoZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFlLmN0cmxLZXkgJiYgIWUuc2hpZnRLZXkgJiYgIWUuYWx0S2V5ICYmIChlLndoaWNoID09IDMyIHx8IGUud2hpY2ggPT0gMjcpKSB7IC8vIFNwYWNlIG9yIEVzY1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LmZpbmQoXCIubGF5b3V0LXBhbmVsLWFjdGlvbi1wcm9wZXJ0aWVzXCIpLmZpcnN0KCkuY2xpY2soKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQudHlwZSA9PSBcIkNvbnRlbnRcIikgeyAvLyBUaGlzIGlzIGEgY29udGVudCBlbGVtZW50LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZS5jdHJsS2V5ICYmICFlLnNoaWZ0S2V5ICYmICFlLmFsdEtleSAmJiBlLndoaWNoID09IDEzKSB7IC8vIEVudGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LmZpbmQoXCIubGF5b3V0LXBhbmVsLWFjdGlvbi1lZGl0XCIpLmZpcnN0KCkuY2xpY2soKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFlbGVtZW50LmNoaWxkcmVuKSB7IC8vIFRoaXMgaXMgYSBjb250YWluZXIuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlLmN0cmxLZXkgJiYgIWUuc2hpZnRLZXkgJiYgZS5hbHRLZXkgJiYgZS53aGljaCA9PSA0MCkgeyAvLyBBbHQrRG93blxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5jaGlsZHJlbi5sZW5ndGggPiAwKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jaGlsZHJlblswXS5zZXRJc0ZvY3VzZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQudHlwZSA9PSBcIkNvbHVtblwiKSB7IC8vIFRoaXMgaXMgYSBjb2x1bW4uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb25uZWN0QWRqYWNlbnQgPSAhZS5jdHJsS2V5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS53aGljaCA9PSAzNykgeyAvLyBMZWZ0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS5hbHRLZXkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5leHBhbmRMZWZ0KGNvbm5lY3RBZGphY2VudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS5zaGlmdEtleSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmNvbnRyYWN0UmlnaHQoY29ubmVjdEFkamFjZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGUud2hpY2ggPT0gMzkpIHsgLy8gUmlnaHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlLmFsdEtleSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmNvbnRyYWN0TGVmdChjb25uZWN0QWRqYWNlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUuc2hpZnRLZXkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5leHBhbmRSaWdodChjb25uZWN0QWRqYWNlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWVsZW1lbnQucGFyZW50KSB7IC8vIFRoaXMgaXMgYSBjaGlsZC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS5hbHRLZXkgJiYgZS53aGljaCA9PSAzOCkgeyAvLyBBbHQrVXBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5wYXJlbnQuc2V0SXNGb2N1c2VkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LnBhcmVudC50eXBlID09IFwiUm93XCIpIHsgLy8gUGFyZW50IGlzIGEgaG9yaXpvbnRhbCBjb250YWluZXIuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZS5jdHJsS2V5ICYmICFlLnNoaWZ0S2V5ICYmICFlLmFsdEtleSAmJiBlLndoaWNoID09IDM3KSB7IC8vIExlZnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucGFyZW50Lm1vdmVGb2N1c1ByZXZDaGlsZChlbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKCFlLmN0cmxLZXkgJiYgIWUuc2hpZnRLZXkgJiYgIWUuYWx0S2V5ICYmIGUud2hpY2ggPT0gMzkpIHsgLy8gUmlnaHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucGFyZW50Lm1vdmVGb2N1c05leHRDaGlsZChlbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGUuY3RybEtleSAmJiAhZS5zaGlmdEtleSAmJiAhZS5hbHRLZXkgJiYgZS53aGljaCA9PSAzNykgeyAvLyBDdHJsK0xlZnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQubW92ZVVwKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNldEZvY3VzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGUuY3RybEtleSAmJiAhZS5zaGlmdEtleSAmJiAhZS5hbHRLZXkgJiYgZS53aGljaCA9PSAzOSkgeyAvLyBDdHJsK1JpZ2h0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lm1vdmVEb3duKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHsgLy8gUGFyZW50IGlzIGEgdmVydGljYWwgY29udGFpbmVyLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWUuY3RybEtleSAmJiAhZS5zaGlmdEtleSAmJiAhZS5hbHRLZXkgJiYgZS53aGljaCA9PSAzOCkgeyAvLyBVcFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5wYXJlbnQubW92ZUZvY3VzUHJldkNoaWxkKGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoIWUuY3RybEtleSAmJiAhZS5zaGlmdEtleSAmJiAhZS5hbHRLZXkgJiYgZS53aGljaCA9PSA0MCkgeyAvLyBEb3duXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnBhcmVudC5tb3ZlRm9jdXNOZXh0Q2hpbGQoZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChlLmN0cmxLZXkgJiYgIWUuc2hpZnRLZXkgJiYgIWUuYWx0S2V5ICYmIGUud2hpY2ggPT0gMzgpIHsgLy8gQ3RybCtVcFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5tb3ZlVXAoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc2V0Rm9jdXMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoZS5jdHJsS2V5ICYmICFlLnNoaWZ0S2V5ICYmICFlLmFsdEtleSAmJiBlLndoaWNoID09IDQwKSB7IC8vIEN0cmwrRG93blxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5tb3ZlRG93bigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYW5kbGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KCk7IC8vIEV2ZW50IGlzIG5vdCB0cmlnZ2VyZWQgYnkgQW5ndWxhciBkaXJlY3RpdmUgYnV0IHJhdyBldmVudCBoYW5kbGVyIG9uIGVsZW1lbnQuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhBQ0s6IFdvcmthcm91bmQgYmVjYXVzZSBvZiBob3cgQW5ndWxhciB0cmVhdHMgdGhlIERPTSB3aGVuIGVsZW1lbnRzIGFyZSBzaGlmdGVkIGFyb3VuZCAtIGlucHV0IGZvY3VzIGlzIHNvbWV0aW1lcyBsb3N0LlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc2V0Rm9jdXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5lZGl0b3IuZm9jdXNlZEVsZW1lbnQuc2V0SXNGb2N1c2VkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LnNldElzRm9jdXNlZEV2ZW50SGFuZGxlcnMucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoKS5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZGVsZXRlID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuZGVsZXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAgICAgY29uZmlndXJlRm9yQ29udGFpbmVyOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZWxlbWVudCA9ICRzY29wZS5lbGVtZW50O1xuXG4gICAgICAgICAgICAgICAgICAgIC8vJHNjb3BlLmlzUmVjZWl2aW5nID0gZmFsc2U7IC8vIFRydWUgd2hlbiBjb250YWluZXIgaXMgcmVjZWl2aW5nIGFuIGV4dGVybmFsIGVsZW1lbnQgdmlhIGRyYWcvZHJvcC5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmdldFNob3dDaGlsZHJlblBsYWNlaG9sZGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRzY29wZS5lbGVtZW50LmNoaWxkcmVuLmxlbmd0aCA9PT0gMCAmJiAhJHNjb3BlLmVsZW1lbnQuZ2V0SXNEcm9wVGFyZ2V0KCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNvcnRhYmxlT3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvcjogXCJtb3ZlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxheTogMTUwLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGVsZW1lbnQuZ2V0SXNTZWFsZWQoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc3RhbmNlOiA1LFxuICAgICAgICAgICAgICAgICAgICAgICAgLy9oYW5kbGU6IGVsZW1lbnQuY2hpbGRyZW4ubGVuZ3RoIDwgMiA/IFwiLmltYWdpbmFyeS1jbGFzc1wiIDogZmFsc2UsIC8vIEZvciBzb21lIHJlYXNvbiBkb2Vzbid0IGdldCByZS1ldmFsdWF0ZWQgYWZ0ZXIgYWRkaW5nIG1vcmUgY2hpbGRyZW4uXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogZnVuY3Rpb24gKGUsIHVpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0SXNEcm9wVGFyZ2V0KHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmVkaXRvci5pc0RyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNYWtlIHRoZSBkcm9wIHRhcmdldCBwbGFjZWhvbGRlciBhcyBoaWdoIGFzIHRoZSBpdGVtIGJlaW5nIGRyYWdnZWQuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdWkucGxhY2Vob2xkZXIuaGVpZ2h0KHVpLml0ZW0uaGVpZ2h0KCkgLSA0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aS5wbGFjZWhvbGRlci5jc3MoXCJtaW4taGVpZ2h0XCIsIDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3A6IGZ1bmN0aW9uIChlLCB1aSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmVkaXRvci5pc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0SXNEcm9wVGFyZ2V0KGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBvdmVyOiBmdW5jdGlvbiAoZSwgdWkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISF1aS5zZW5kZXIgJiYgISF1aS5zZW5kZXJbMF0uaXNUb29sYm94KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIXVpLnNlbmRlclswXS5kcm9wVGFyZ2V0VGltZW91dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKHVpLnNlbmRlclswXS5kcm9wVGFyZ2V0VGltZW91dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aS5zZW5kZXJbMF0uZHJvcFRhcmdldFRpbWVvdXQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LnR5cGUgPT0gXCJSb3dcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZXJlIHdhcyBhIHByZXZpb3VzIGRyb3AgdGFyZ2V0IGFuZCBpdCB3YXMgYSByb3csIHJvbGwgYmFjayBhbnkgcGVuZGluZyBjb2x1bW4gYWRkcyB0byBpdC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJldmlvdXNEcm9wVGFyZ2V0ID0gZWxlbWVudC5lZGl0b3IuZHJvcFRhcmdldEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhcHJldmlvdXNEcm9wVGFyZ2V0ICYmIHByZXZpb3VzRHJvcFRhcmdldC50eXBlID09IFwiUm93XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZpb3VzRHJvcFRhcmdldC5yb2xsYmFja0FkZENvbHVtbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zZXRJc0Ryb3BUYXJnZXQoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdWkuc2VuZGVyWzBdLmRyb3BUYXJnZXRUaW1lb3V0ID0gJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQudHlwZSA9PSBcIlJvd1wiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlY2VpdmVkQ29sdW1uID0gdWkuaXRlbS5zb3J0YWJsZS5tb2RlbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVjZWl2ZWRDb2x1bW5XaWR0aCA9IE1hdGguZmxvb3IoMTIgLyAoZWxlbWVudC5jaGlsZHJlbi5sZW5ndGggKyAxKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWRDb2x1bW4ud2lkdGggPSByZWNlaXZlZENvbHVtbldpZHRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY2VpdmVkQ29sdW1uLm9mZnNldCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5iZWdpbkFkZENvbHVtbihyZWNlaXZlZENvbHVtbldpZHRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNYWtlIHRoZSBkcm9wIHRhcmdldCBwbGFjZWhvbGRlciB0aGUgY29ycmVjdCB3aWR0aCBhbmQgYXMgaGlnaCBhcyB0aGUgaGlnaGVzdCBleGlzdGluZyBjb2x1bW4gaW4gdGhlIHJvdy5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWF4SGVpZ2h0ID0gXy5tYXgoXygkZWxlbWVudC5maW5kKFwiPiAubGF5b3V0LWNoaWxkcmVuID4gLmxheW91dC1jb2x1bW46bm90KC51aS1zb3J0YWJsZS1wbGFjZWhvbGRlcilcIikpLm1hcChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJChlKS5oZWlnaHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMTsgaSA8PSAxMjsgaSsrKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aS5wbGFjZWhvbGRlci5yZW1vdmVDbGFzcyhcImNvbC14cy1cIiArIGkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpLnBsYWNlaG9sZGVyLmFkZENsYXNzKFwiY29sLXhzLVwiICsgcmVjZWl2ZWRDb2x1bW4ud2lkdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtYXhIZWlnaHQgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpLnBsYWNlaG9sZGVyLmhlaWdodChtYXhIZWlnaHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aS5wbGFjZWhvbGRlci5jc3MoXCJtaW4taGVpZ2h0XCIsIDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdWkucGxhY2Vob2xkZXIuaGVpZ2h0KDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aS5wbGFjZWhvbGRlci5jc3MoXCJtaW4taGVpZ2h0XCIsIFwiXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0SXNEcm9wVGFyZ2V0KHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAxNTApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlOiBmdW5jdGlvbiAoZSwgdWkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISF1aS5zZW5kZXIgJiYgISF1aS5zZW5kZXJbMF0uaXNUb29sYm94KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlY2VpdmVkRWxlbWVudCA9IHVpLml0ZW0uc29ydGFibGUubW9kZWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFyZWNlaXZlZEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC50eXBlID09IFwiUm93XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY29tbWl0QWRkQ29sdW1uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdWxkIGlkZWFsbHkgY2FsbCBMYXlvdXRFZGl0b3IuQ29udGFpbmVyLmFkZENoaWxkKCkgaW5zdGVhZCwgYnV0IHNpbmNlIHRoaXMgaGFuZGxlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlzIHJ1biAqYmVmb3JlKiB0aGUgdWktc29ydGFibGUgZGlyZWN0aXZlJ3MgaGFuZGxlciwgaWYgd2UgdHJ5IHRvIGFkZCB0aGUgY2hpbGQgdG8gdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXJyYXkgdGhhdCBoYW5kbGVyIHdpbGwgZ2V0IGFuIGV4Y2VwdGlvbiB3aGVuIHRyeWluZyB0byBkbyB0aGUgc2FtZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBCZWNhdXNlIG9mIHRoaXMsIHdlIG5lZWQgdG8gaW52b2tlIFwic2V0UGFyZW50XCIgc28gdGhhdCBzcGVjaWZpYyBjb250YWluZXIgdHlwZXMgY2FuIHBlcmZvcm0gZWxlbWVudCBzcGVmaWNpYyBpbml0aWFsaXphdGlvbi5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZEVsZW1lbnQuc2V0RWRpdG9yKGVsZW1lbnQuZWRpdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZEVsZW1lbnQuc2V0UGFyZW50KGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIXJlY2VpdmVkRWxlbWVudC5oYXNFZGl0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRyb290LmVkaXRFbGVtZW50KHJlY2VpdmVkRWxlbWVudCkudGhlbihmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFhcmdzLmNhbmNlbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY2VpdmVkRWxlbWVudC5kYXRhID0gYXJncy5lbGVtZW50LmRhdGE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVjZWl2ZWRFbGVtZW50LnNldEh0bWwpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY2VpdmVkRWxlbWVudC5zZXRIdG1sKGFyZ3MuZWxlbWVudC5odG1sKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFhcmdzLmNhbmNlbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWRFbGVtZW50LmRlbGV0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWRFbGVtZW50LnNldElzRm9jdXNlZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vJHNjb3BlLmlzUmVjZWl2aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zZXRJc0Ryb3BUYXJnZXQoZmFsc2UpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vJHNjb3BlLmlzUmVjZWl2aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zZXRJc0Ryb3BUYXJnZXQoZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIXJlY2VpdmVkRWxlbWVudClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWRFbGVtZW50LnNldElzRm9jdXNlZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY2xpY2sgPSBmdW5jdGlvbiAoY2hpbGQsIGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY2hpbGQuZWRpdG9yLmlzRHJhZ2dpbmcpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGQuc2V0SXNGb2N1c2VkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5nZXRDbGFzc2VzID0gZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gW1wibGF5b3V0LWVsZW1lbnRcIl07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWNoaWxkLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJsYXlvdXQtY29udGFpbmVyXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZC5nZXRJc1NlYWxlZCgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1jb250YWluZXItc2VhbGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1cIiArIGNoaWxkLnR5cGUudG9Mb3dlckNhc2UoKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWNoaWxkLmRyb3BUYXJnZXRDbGFzcylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChjaGlsZC5kcm9wVGFyZ2V0Q2xhc3MpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBNb3ZlIHRoZXNlIHRvIGVpdGhlciB0aGUgQ29sdW1uIGRpcmVjdGl2ZSBvciB0aGUgQ29sdW1uIG1vZGVsIGNsYXNzLlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkLnR5cGUgPT0gXCJSb3dcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwicm93XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY2hpbGQuY2FuQWRkQ29sdW1uKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LXJvdy1mdWxsXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkLnR5cGUgPT0gXCJDb2x1bW5cIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwiY29sLXhzLVwiICsgY2hpbGQud2lkdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwiY29sLXhzLW9mZnNldC1cIiArIGNoaWxkLm9mZnNldCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hpbGQudHlwZSA9PSBcIkNvbnRlbnRcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1jb250ZW50LVwiICsgY2hpbGQuY29udGVudFR5cGVDbGFzcyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZC5nZXRJc0FjdGl2ZSgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LWVsZW1lbnQtYWN0aXZlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkLmdldElzRm9jdXNlZCgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LWVsZW1lbnQtZm9jdXNlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZC5nZXRJc1NlbGVjdGVkKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJsYXlvdXQtZWxlbWVudC1zZWxlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZC5nZXRJc0Ryb3BUYXJnZXQoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1lbGVtZW50LWRyb3B0YXJnZXRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hpbGQuaXNUZW1wbGF0ZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJsYXlvdXQtZWxlbWVudC10ZW1wbGF0ZWRcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pOyIsImFuZ3VsYXJcbiAgICAubW9kdWxlKFwiTGF5b3V0RWRpdG9yXCIpXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dEVkaXRvclwiLCBbXCJlbnZpcm9ubWVudFwiLFxuICAgICAgICBmdW5jdGlvbiAoZW52aXJvbm1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxuICAgICAgICAgICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXCIkc2NvcGVcIiwgXCIkZWxlbWVudFwiLCBcIiRhdHRyc1wiLCBcIiRjb21waWxlXCIsIFwiY2xpcGJvYXJkXCIsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50LCAkYXR0cnMsICRjb21waWxlLCBjbGlwYm9hcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghISRhdHRycy5tb2RlbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudCA9IGV2YWwoJGF0dHJzLm1vZGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgJ21vZGVsJyBhdHRyaWJ1dGUgbXVzdCBldmFsdWF0ZSB0byBhIExheW91dEVkaXRvci5FZGl0b3Igb2JqZWN0LlwiKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNsaWNrID0gZnVuY3Rpb24gKGNhbnZhcywgZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY2FudmFzLmVkaXRvci5pc0RyYWdnaW5nKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW52YXMuc2V0SXNGb2N1c2VkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5nZXRDbGFzc2VzID0gZnVuY3Rpb24gKGNhbnZhcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBbXCJsYXlvdXQtZWxlbWVudFwiLCBcImxheW91dC1jb250YWluZXJcIiwgXCJsYXlvdXQtY2FudmFzXCJdO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbnZhcy5nZXRJc0FjdGl2ZSgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1lbGVtZW50LWFjdGl2ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FudmFzLmdldElzRm9jdXNlZCgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcImxheW91dC1lbGVtZW50LWZvY3VzZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbnZhcy5nZXRJc1NlbGVjdGVkKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LWVsZW1lbnQtc2VsZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbnZhcy5nZXRJc0Ryb3BUYXJnZXQoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJsYXlvdXQtZWxlbWVudC1kcm9wdGFyZ2V0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYW52YXMuaXNUZW1wbGF0ZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwibGF5b3V0LWVsZW1lbnQtdGVtcGxhdGVkXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFuIHVuZm9ydHVuYXRlIHNpZGUtZWZmZWN0IG9mIHRoZSBuZXh0IGhhY2sgb24gbGluZSA1NCBpcyB0aGF0IHRoZSBjcmVhdGVkIGVsZW1lbnRzIGFyZW4ndCBhZGRlZCB0byB0aGUgRE9NIHlldCwgc28gd2UgY2FuJ3QgdXNlIGl0IHRvIGdldCB0byB0aGUgcGFyZW50IFwiLmxheW91dC1kZXNpZ2VyXCIgZWxlbWVudC5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdvcmsgYXJvdW5kOiBhY2Nlc3MgdGhhdCBlbGVtZW50IGRpcmVjdGx5ICh3aGljaCBlZmVjdGl2ZWx5IHR1cm5zIG11bHRpcGxlIGxheW91dCBlZGl0b3JzIG9uIGEgc2luZ2xlIHBhZ2UgaW1wb3NzaWJsZSkuIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gLy92YXIgbGF5b3V0RGVzaWduZXJIb3N0ID0gJGVsZW1lbnQuY2xvc2VzdChcIi5sYXlvdXQtZGVzaWduZXJcIikuZGF0YShcImxheW91dC1kZXNpZ25lci1ob3N0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxheW91dERlc2lnbmVySG9zdCA9ICQoXCIubGF5b3V0LWRlc2lnbmVyXCIpLmRhdGEoXCJsYXlvdXQtZGVzaWduZXItaG9zdFwiKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRyb290LmxheW91dERlc2lnbmVySG9zdCA9IGxheW91dERlc2lnbmVySG9zdDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGF5b3V0RGVzaWduZXJIb3N0LmVsZW1lbnQub24oXCJyZXBsYWNlY2FudmFzXCIsIGZ1bmN0aW9uIChlLCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVkaXRvciA9ICRzY29wZS5lbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYW52YXNEYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBhcmdzLmNhbnZhcy5kYXRhLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBodG1sSWQ6IGFyZ3MuY2FudmFzLmh0bWxJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHRtbENsYXNzOiBhcmdzLmNhbnZhcy5odG1sQ2xhc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0bWxTdHlsZTogYXJncy5jYW52YXMuaHRtbFN0eWxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc1RlbXBsYXRlZDogYXJncy5jYW52YXMuaXNUZW1wbGF0ZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBhcmdzLmNhbnZhcy5jaGlsZHJlblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBIQUNLOiBJbnN0ZWFkIG9mIHNpbXBseSB1cGRhdGluZyB0aGUgJHNjb3BlLmVsZW1lbnQgd2l0aCBhIG5ldyBpbnN0YW5jZSwgd2UgbmVlZCB0byByZXBsYWNlIHRoZSBlbnRpcmUgb3JjLWxheW91dC1lZGl0b3IgbWFya3VwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW4gb3JkZXIgZm9yIGFuZ3VsYXIgdG8gcmViaW5kIHN0YXJ0aW5nIHdpdGggdGhlIENhbnZhcyBlbGVtZW50LiBPdGhlcndpc2UsIGZvciBzb21lIHJlYXNvbiwgaXQgd2lsbCByZWJpbmQgc3RhcnRpbmcgd2l0aCB0aGUgZmlyc3QgY2hpbGQgb2YgQ2FudmFzLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFlvdSBjYW4gc2VlIHRoaXMgaGFwcGVuaW5nIHdoZW4gc2V0dGluZyBhIGJyZWFrcG9pbnQgaW4gU2NvcGVDb25maWd1cmF0b3Igd2hlcmUgY29udGFpbmVycyBhcmUgaW5pdGlhbGl6ZWQgd2l0aCBkcmFnICYgZHJvcDogb24gcGFnZSBsb2FkLCB0aGUgZmlyc3QgZWxlbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlzIGEgQ2FudmFzIChnb29kKSwgYnV0IGFmdGVyIGhhdmluZyBzZWxlY3RlZCBhbm90aGVyIHRlbXBsYXRlLCB0aGUgZmlyc3QgZWxlbWVudCBpcyAodHlwaWNhbGx5KSBhIEdyaWQgKGJhZCkuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2ltcGx5IHJlY29tcGlsaW5nIHRoZSBvcmMtbGF5b3V0LWVkaXRvciBkaXJlY3RpdmUgd2lsbCBjYXVzZSB0aGUgZW50aXJlIHRoaW5nIHRvIGJlIGdlbmVyYXRlZCwgd2hpY2ggd29ya3MganVzdCBmaW5lIGFzIHdlbGwgKGV2ZW4gdGhvdWdoIG5vdCBpcyBuaWNlIGFzIHNpbXBseSBsZXZlcmFnaW5nIG1vZGVsIGJpbmRpbmcpLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxheW91dERlc2lnbmVySG9zdC5lZGl0b3IgPSB3aW5kb3cubGF5b3V0RWRpdG9yID0gbmV3IExheW91dEVkaXRvci5FZGl0b3IoZWRpdG9yLmNvbmZpZywgY2FudmFzRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBsYXRlID0gXCI8b3JjLWxheW91dC1lZGl0b3JcIiArIFwiIG1vZGVsPSd3aW5kb3cubGF5b3V0RWRpdG9yJyAvPlwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBodG1sID0gJGNvbXBpbGUodGVtcGxhdGUpKCRzY29wZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChcIi5sYXlvdXQtZWRpdG9yLWhvbGRlclwiKS5odG1sKGh0bWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kcm9vdC5lZGl0RWxlbWVudCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhvc3QgPSAkc2NvcGUuJHJvb3QubGF5b3V0RGVzaWduZXJIb3N0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBob3N0LmVkaXRFbGVtZW50KGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRyb290LmFkZEVsZW1lbnQgPSBmdW5jdGlvbiAoY29udGVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaG9zdCA9ICRzY29wZS4kcm9vdC5sYXlvdXREZXNpZ25lckhvc3Q7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhvc3QuYWRkRWxlbWVudChjb250ZW50VHlwZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUudG9nZ2xlSW5saW5lRWRpdGluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISRzY29wZS5lbGVtZW50LmlubGluZUVkaXRpbmdJc0FjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5pbmxpbmVFZGl0aW5nSXNBY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZWxlbWVudC5maW5kKFwiLmxheW91dC10b29sYmFyLWNvbnRhaW5lclwiKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3RvciA9IFwiI2xheW91dC1lZGl0b3ItXCIgKyAkc2NvcGUuJGlkICsgXCIgLmxheW91dC1odG1sIC5sYXlvdXQtY29udGVudC1tYXJrdXBbZGF0YS10ZW1wbGF0ZWQ9ZmFsc2VdXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmaXJzdENvbnRlbnRFZGl0b3JJZCA9ICQoc2VsZWN0b3IpLmZpcnN0KCkuYXR0cihcImlkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW55bWNlLmluaXQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3I6IHNlbGVjdG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlbWU6IFwibW9kZXJuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY2hlbWE6IFwiaHRtbDVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImFkdmxpc3QgYXV0b2xpbmsgbGlzdHMgbGluayBpbWFnZSBjaGFybWFwIHByaW50IHByZXZpZXcgaHIgYW5jaG9yIHBhZ2VicmVha1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwic2VhcmNocmVwbGFjZSB3b3JkY291bnQgdmlzdWFsYmxvY2tzIHZpc3VhbGNoYXJzIGNvZGUgZnVsbHNjcmVlblwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiaW5zZXJ0ZGF0ZXRpbWUgbWVkaWEgbm9uYnJlYWtpbmcgdGFibGUgY29udGV4dG1lbnUgZGlyZWN0aW9uYWxpdHlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImVtb3RpY29ucyB0ZW1wbGF0ZSBwYXN0ZSB0ZXh0Y29sb3IgY29sb3JwaWNrZXIgdGV4dHBhdHRlcm5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImZ1bGxzY3JlZW4gYXV0b3Jlc2l6ZVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJhcjogXCJ1bmRvIHJlZG8gY3V0IGNvcHkgcGFzdGUgfCBib2xkIGl0YWxpYyB8IGJ1bGxpc3QgbnVtbGlzdCBvdXRkZW50IGluZGVudCBmb3JtYXRzZWxlY3QgfCBhbGlnbmxlZnQgYWxpZ25jZW50ZXIgYWxpZ25yaWdodCBhbGlnbmp1c3RpZnkgbHRyIHJ0bCB8IGxpbmsgdW5saW5rIGNoYXJtYXAgfCBjb2RlIGZ1bGxzY3JlZW4gY2xvc2VcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnZlcnRfdXJsczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZF9lbGVtZW50czogXCIqWypdXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTaG91bGRuJ3QgYmUgbmVlZGVkIGR1ZSB0byB0aGUgdmFsaWRfZWxlbWVudHMgc2V0dGluZywgYnV0IFRpbnlNQ0Ugd291bGQgc3RyaXAgc2NyaXB0LnNyYyB3aXRob3V0IGl0LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5kZWRfdmFsaWRfZWxlbWVudHM6IFwic2NyaXB0W3R5cGV8ZGVmZXJ8c3JjfGxhbmd1YWdlXVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzYmFyOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNraW46IFwib3JjaGFyZGxpZ2h0Z3JheVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5saW5lOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZml4ZWRfdG9vbGJhcl9jb250YWluZXI6IFwiI2xheW91dC1lZGl0b3ItXCIgKyAkc2NvcGUuJGlkICsgXCIgLmxheW91dC10b29sYmFyLWNvbnRhaW5lclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdF9pbnN0YW5jZV9jYWxsYmFjazogZnVuY3Rpb24gKGVkaXRvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlZGl0b3IuaWQgPT0gZmlyc3RDb250ZW50RWRpdG9ySWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbnltY2UuZXhlY0NvbW1hbmQoXCJtY2VGb2N1c1wiLCBmYWxzZSwgZWRpdG9yLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW55bWNlLnJlbW92ZShcIiNsYXlvdXQtZWRpdG9yLVwiICsgJHNjb3BlLiRpZCArIFwiIC5sYXlvdXQtY29udGVudC1tYXJrdXBcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRlbGVtZW50LmZpbmQoXCIubGF5b3V0LXRvb2xiYXItY29udGFpbmVyXCIpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuaW5saW5lRWRpdGluZ0lzQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgJChkb2N1bWVudCkub24oXCJjdXQgY29weSBwYXN0ZVwiLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSBwc2V1ZG8gY2xpcGJvYXJkIHdhcyBhbHJlYWR5IGludm9rZWQgKHdoaWNoIGhhcHBlbnMgb24gdGhlIGZpcnN0IGNsaXBib2FyZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9wZXJhdGlvbiBhZnRlciBwYWdlIGxvYWQgZXZlbiBpZiBuYXRpdmUgY2xpcGJvYXJkIHN1cHBvcnQgZXhpc3RzKSB0aGVuIHNpdCB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25lIG9wZXJhdGlvbiBvdXQsIGJ1dCBtYWtlIHN1cmUgd2hhdGV2ZXIgaXMgb24gdGhlIHBzZXVkbyBjbGlwYm9hcmQgZ2V0cyBtaWdyYXRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvIHRoZSBuYXRpdmUgY2xpcGJvYXJkIGZvciBzdWJzZXF1ZW50IG9wZXJhdGlvbnMuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsaXBib2FyZC53YXNJbnZva2VkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuc2V0RGF0YShcInRleHQvcGxhaW5cIiwgY2xpcGJvYXJkLmdldERhdGEoXCJ0ZXh0L3BsYWluXCIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuc2V0RGF0YShcInRleHQvanNvblwiLCBjbGlwYm9hcmQuZ2V0RGF0YShcInRleHQvanNvblwiKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmb2N1c2VkRWxlbWVudCA9ICRzY29wZS5lbGVtZW50LmZvY3VzZWRFbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFmb2N1c2VkRWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChlLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNvcHlcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzZWRFbGVtZW50LmNvcHkoZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjdXRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvY3VzZWRFbGVtZW50LmN1dChlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcInBhc3RlXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb2N1c2VkRWxlbWVudC5wYXN0ZShlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSEFDSzogV29ya2Fyb3VuZCBiZWNhdXNlIG9mIGhvdyBBbmd1bGFyIHRyZWF0cyB0aGUgRE9NIHdoZW4gZWxlbWVudHMgYXJlIHNoaWZ0ZWQgYXJvdW5kIC0gaW5wdXQgZm9jdXMgaXMgc29tZXRpbWVzIGxvc3QuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghISRzY29wZS5lbGVtZW50LmZvY3VzZWRFbGVtZW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuZm9jdXNlZEVsZW1lbnQuc2V0SXNGb2N1c2VkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBOYXRpdmUgY2xpcGJvYXJkIHN1cHBvcnQgb2J2aW91c2x5IGV4aXN0cywgc28gZGlzYWJsZSB0aGUgcGV1ZG8gY2xpcGJvYXJkIGZyb20gbm93IG9uLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZC5kaXNhYmxlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IGVudmlyb25tZW50LnRlbXBsYXRlVXJsKFwiRWRpdG9yXCIpLFxuICAgICAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE5vIGNsaWNrcyBzaG91bGQgcHJvcGFnYXRlIGZyb20gdGhlIFRpbnlNQ0UgdG9vbGJhcnMuXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuZmluZChcIi5sYXlvdXQtdG9vbGJhci1jb250YWluZXJcIikuY2xpY2soZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBJbnRlcmNlcHQgbW91c2Vkb3duIG9uIGVkaXRvciB3aGlsZSBpbiBpbmxpbmUgZWRpdGluZyBtb2RlIHRvIFxuICAgICAgICAgICAgICAgICAgICAvLyBwcmV2ZW50IGN1cnJlbnQgZWRpdG9yIGZyb20gbG9zaW5nIGZvY3VzLlxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lm1vdXNlZG93bihmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjb3BlLmVsZW1lbnQuaW5saW5lRWRpdGluZ0lzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC8vIFVuZm9jdXMgYW5kIHVuc2VsZWN0IGV2ZXJ5dGhpbmcgb24gY2xpY2sgb3V0c2lkZSBvZiBjYW52YXMuXG4gICAgICAgICAgICAgICAgICAgICQod2luZG93KS5jbGljayhmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXhjZXB0IHdoZW4gaW4gaW5saW5lIGVkaXRpbmcgbW9kZS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghc2NvcGUuZWxlbWVudC5pbmxpbmVFZGl0aW5nSXNBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5lbGVtZW50LmFjdGl2ZUVsZW1lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5lbGVtZW50LmZvY3VzZWRFbGVtZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pOyIsImFuZ3VsYXJcbiAgICAubW9kdWxlKFwiTGF5b3V0RWRpdG9yXCIpXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dENhbnZhc1wiLCBbXCJzY29wZUNvbmZpZ3VyYXRvclwiLCBcImVudmlyb25tZW50XCIsXG4gICAgICAgIGZ1bmN0aW9uIChzY29wZUNvbmZpZ3VyYXRvciwgZW52aXJvbm1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxuICAgICAgICAgICAgICAgIHNjb3BlOiB7IGVsZW1lbnQ6IFwiPVwiIH0sXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIiwgXCIkYXR0cnNcIixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQsICRhdHRycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVDb25maWd1cmF0b3IuY29uZmlndXJlRm9yRWxlbWVudCgkc2NvcGUsICRlbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlQ29uZmlndXJhdG9yLmNvbmZpZ3VyZUZvckNvbnRhaW5lcigkc2NvcGUsICRlbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zb3J0YWJsZU9wdGlvbnNbXCJheGlzXCJdID0gXCJ5XCI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiBlbnZpcm9ubWVudC50ZW1wbGF0ZVVybChcIkNhbnZhc1wiKSxcbiAgICAgICAgICAgICAgICByZXBsYWNlOiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXSk7IiwiYW5ndWxhclxuICAgIC5tb2R1bGUoXCJMYXlvdXRFZGl0b3JcIilcbiAgICAuZGlyZWN0aXZlKFwib3JjTGF5b3V0Q2hpbGRcIiwgW1wiJGNvbXBpbGVcIixcbiAgICAgICAgZnVuY3Rpb24gKCRjb21waWxlKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlc3RyaWN0OiBcIkVcIixcbiAgICAgICAgICAgICAgICBzY29wZTogeyBlbGVtZW50OiBcIj1cIiB9LFxuICAgICAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcGxhdGUgPSBcIjxvcmMtbGF5b3V0LVwiICsgc2NvcGUuZWxlbWVudC50eXBlLnRvTG93ZXJDYXNlKCkgKyBcIiBlbGVtZW50PSdlbGVtZW50JyAvPlwiO1xuICAgICAgICAgICAgICAgICAgICB2YXIgaHRtbCA9ICRjb21waWxlKHRlbXBsYXRlKShzY29wZSk7XG4gICAgICAgICAgICAgICAgICAgICQoZWxlbWVudCkucmVwbGFjZVdpdGgoaHRtbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pOyIsImFuZ3VsYXJcbiAgICAubW9kdWxlKFwiTGF5b3V0RWRpdG9yXCIpXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dENvbHVtblwiLCBbXCIkY29tcGlsZVwiLCBcInNjb3BlQ29uZmlndXJhdG9yXCIsIFwiZW52aXJvbm1lbnRcIixcbiAgICAgICAgZnVuY3Rpb24gKCRjb21waWxlLCBzY29wZUNvbmZpZ3VyYXRvciwgZW52aXJvbm1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxuICAgICAgICAgICAgICAgIHNjb3BlOiB7IGVsZW1lbnQ6IFwiPVwiIH0sXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlQ29uZmlndXJhdG9yLmNvbmZpZ3VyZUZvckVsZW1lbnQoJHNjb3BlLCAkZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZUNvbmZpZ3VyYXRvci5jb25maWd1cmVGb3JDb250YWluZXIoJHNjb3BlLCAkZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc29ydGFibGVPcHRpb25zW1wiYXhpc1wiXSA9IFwieVwiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogZW52aXJvbm1lbnQudGVtcGxhdGVVcmwoXCJDb2x1bW5cIiksXG4gICAgICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuZmluZChcIi5sYXlvdXQtY29sdW1uLXJlc2l6ZS1iYXJcIikuZHJhZ2dhYmxlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF4aXM6IFwieFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVscGVyOiBcImNsb25lXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICByZXZlcnQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogZnVuY3Rpb24gKGUsIHVpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuZWxlbWVudC5lZGl0b3IuaXNSZXNpemluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZHJhZzogZnVuY3Rpb24gKGUsIHVpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbHVtbkVsZW1lbnQgPSBlbGVtZW50LnBhcmVudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb2x1bW5TaXplID0gY29sdW1uRWxlbWVudC53aWR0aCgpIC8gc2NvcGUuZWxlbWVudC53aWR0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29ubmVjdEFkamFjZW50ID0gIWUuY3RybEtleTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJChlLnRhcmdldCkuaGFzQ2xhc3MoXCJsYXlvdXQtY29sdW1uLXJlc2l6ZS1iYXItbGVmdFwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGVsdGEgPSB1aS5vZmZzZXQubGVmdCAtIGNvbHVtbkVsZW1lbnQub2Zmc2V0KCkubGVmdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlbHRhIDwgLWNvbHVtblNpemUgJiYgc2NvcGUuZWxlbWVudC5jYW5FeHBhbmRMZWZ0KGNvbm5lY3RBZGphY2VudCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuZWxlbWVudC5leHBhbmRMZWZ0KGNvbm5lY3RBZGphY2VudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChkZWx0YSA+IGNvbHVtblNpemUgJiYgc2NvcGUuZWxlbWVudC5jYW5Db250cmFjdExlZnQoY29ubmVjdEFkamFjZW50KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5lbGVtZW50LmNvbnRyYWN0TGVmdChjb25uZWN0QWRqYWNlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoJChlLnRhcmdldCkuaGFzQ2xhc3MoXCJsYXlvdXQtY29sdW1uLXJlc2l6ZS1iYXItcmlnaHRcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRlbHRhID0gdWkub2Zmc2V0LmxlZnQgLSBjb2x1bW5FbGVtZW50LndpZHRoKCkgLSBjb2x1bW5FbGVtZW50Lm9mZnNldCgpLmxlZnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZWx0YSA+IGNvbHVtblNpemUgJiYgc2NvcGUuZWxlbWVudC5jYW5FeHBhbmRSaWdodChjb25uZWN0QWRqYWNlbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmVsZW1lbnQuZXhwYW5kUmlnaHQoY29ubmVjdEFkamFjZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGRlbHRhIDwgLWNvbHVtblNpemUgJiYgc2NvcGUuZWxlbWVudC5jYW5Db250cmFjdFJpZ2h0KGNvbm5lY3RBZGphY2VudCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuZWxlbWVudC5jb250cmFjdFJpZ2h0KGNvbm5lY3RBZGphY2VudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3A6IGZ1bmN0aW9uIChlLCB1aSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5lbGVtZW50LmVkaXRvci5pc1Jlc2l6aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKTsiLCJhbmd1bGFyXG4gICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxuICAgIC5kaXJlY3RpdmUoXCJvcmNMYXlvdXRDb250ZW50XCIsIFtcIiRzY2VcIiwgXCJzY29wZUNvbmZpZ3VyYXRvclwiLCBcImVudmlyb25tZW50XCIsXG4gICAgICAgIGZ1bmN0aW9uICgkc2NlLCBzY29wZUNvbmZpZ3VyYXRvciwgZW52aXJvbm1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxuICAgICAgICAgICAgICAgIHNjb3BlOiB7IGVsZW1lbnQ6IFwiPVwiIH0sXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlQ29uZmlndXJhdG9yLmNvbmZpZ3VyZUZvckVsZW1lbnQoJHNjb3BlLCAkZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWRpdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJHJvb3QuZWRpdEVsZW1lbnQoJHNjb3BlLmVsZW1lbnQpLnRoZW4oZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5jYW5jZWwpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5kYXRhID0gYXJncy5lbGVtZW50LmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5zZXRIdG1sKGFyZ3MuZWxlbWVudC5odG1sKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPdmVyd3JpdGUgdGhlIHNldEh0bWwgZnVuY3Rpb24gc28gdGhhdCB3ZSBjYW4gdXNlIHRoZSAkc2NlIHNlcnZpY2UgdG8gdHJ1c3QgdGhlIGh0bWwgKGFuZCBub3QgaGF2ZSB0aGUgaHRtbCBiaW5kaW5nIHN0cmlwIGNlcnRhaW4gdGFncykuXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5zZXRIdG1sID0gZnVuY3Rpb24gKGh0bWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5odG1sID0gaHRtbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5odG1sVW5zYWZlID0gJHNjZS50cnVzdEFzSHRtbChodG1sKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LnNldEh0bWwoJHNjb3BlLmVsZW1lbnQuaHRtbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiBlbnZpcm9ubWVudC50ZW1wbGF0ZVVybChcIkNvbnRlbnRcIiksXG4gICAgICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pOyIsImFuZ3VsYXJcbiAgICAubW9kdWxlKFwiTGF5b3V0RWRpdG9yXCIpXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dEh0bWxcIiwgW1wiJHNjZVwiLCBcInNjb3BlQ29uZmlndXJhdG9yXCIsIFwiZW52aXJvbm1lbnRcIixcbiAgICAgICAgZnVuY3Rpb24gKCRzY2UsIHNjb3BlQ29uZmlndXJhdG9yLCBlbnZpcm9ubWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByZXN0cmljdDogXCJFXCIsXG4gICAgICAgICAgICAgICAgc2NvcGU6IHsgZWxlbWVudDogXCI9XCIgfSxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXCIkc2NvcGVcIiwgXCIkZWxlbWVudFwiLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVDb25maWd1cmF0b3IuY29uZmlndXJlRm9yRWxlbWVudCgkc2NvcGUsICRlbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lZGl0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kcm9vdC5lZGl0RWxlbWVudCgkc2NvcGUuZWxlbWVudCkudGhlbihmdW5jdGlvbiAoYXJncykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmNhbmNlbClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LmRhdGEgPSBhcmdzLmVsZW1lbnQuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LnNldEh0bWwoYXJncy5lbGVtZW50Lmh0bWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUudXBkYXRlQ29udGVudCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuc2V0SHRtbChlLnRhcmdldC5pbm5lckhUTUwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gT3ZlcndyaXRlIHRoZSBzZXRIdG1sIGZ1bmN0aW9uIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGUgJHNjZSBzZXJ2aWNlIHRvIHRydXN0IHRoZSBodG1sIChhbmQgbm90IGhhdmUgdGhlIGh0bWwgYmluZGluZyBzdHJpcCBjZXJ0YWluIHRhZ3MpLlxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuc2V0SHRtbCA9IGZ1bmN0aW9uIChodG1sKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuaHRtbCA9IGh0bWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuaHRtbFVuc2FmZSA9ICRzY2UudHJ1c3RBc0h0bWwoaHRtbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5zZXRIdG1sKCRzY29wZS5lbGVtZW50Lmh0bWwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogZW52aXJvbm1lbnQudGVtcGxhdGVVcmwoXCJIdG1sXCIpLFxuICAgICAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1vdXNlIGRvd24gZXZlbnRzIG11c3Qgbm90IGJlIGludGVyY2VwdGVkIGJ5IGRyYWcgYW5kIGRyb3Agd2hpbGUgaW5saW5lIGVkaXRpbmcgaXMgYWN0aXZlLFxuICAgICAgICAgICAgICAgICAgICAvLyBvdGhlcndpc2UgY2xpY2tzIGluIGlubGluZSBlZGl0b3JzIHdpbGwgaGF2ZSBubyBlZmZlY3QuXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuZmluZChcIi5sYXlvdXQtY29udGVudC1tYXJrdXBcIikubW91c2Vkb3duKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2NvcGUuZWxlbWVudC5lZGl0b3IuaW5saW5lRWRpdGluZ0lzQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pOyIsImFuZ3VsYXJcbiAgICAubW9kdWxlKFwiTGF5b3V0RWRpdG9yXCIpXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dEdyaWRcIiwgW1wiJGNvbXBpbGVcIiwgXCJzY29wZUNvbmZpZ3VyYXRvclwiLCBcImVudmlyb25tZW50XCIsXG4gICAgICAgIGZ1bmN0aW9uICgkY29tcGlsZSwgc2NvcGVDb25maWd1cmF0b3IsIGVudmlyb25tZW50KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlc3RyaWN0OiBcIkVcIixcbiAgICAgICAgICAgICAgICBzY29wZTogeyBlbGVtZW50OiBcIj1cIiB9LFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcIiRzY29wZVwiLCBcIiRlbGVtZW50XCIsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZUNvbmZpZ3VyYXRvci5jb25maWd1cmVGb3JFbGVtZW50KCRzY29wZSwgJGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVDb25maWd1cmF0b3IuY29uZmlndXJlRm9yQ29udGFpbmVyKCRzY29wZSwgJGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnNvcnRhYmxlT3B0aW9uc1tcImF4aXNcIl0gPSBcInlcIjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IGVudmlyb25tZW50LnRlbXBsYXRlVXJsKFwiR3JpZFwiKSxcbiAgICAgICAgICAgICAgICByZXBsYWNlOiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXSk7IiwiYW5ndWxhclxuICAgIC5tb2R1bGUoXCJMYXlvdXRFZGl0b3JcIilcbiAgICAuZGlyZWN0aXZlKFwib3JjTGF5b3V0Um93XCIsIFtcIiRjb21waWxlXCIsIFwic2NvcGVDb25maWd1cmF0b3JcIiwgXCJlbnZpcm9ubWVudFwiLFxuICAgICAgICBmdW5jdGlvbiAoJGNvbXBpbGUsIHNjb3BlQ29uZmlndXJhdG9yLCBlbnZpcm9ubWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByZXN0cmljdDogXCJFXCIsXG4gICAgICAgICAgICAgICAgc2NvcGU6IHsgZWxlbWVudDogXCI9XCIgfSxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXCIkc2NvcGVcIiwgXCIkZWxlbWVudFwiLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVDb25maWd1cmF0b3IuY29uZmlndXJlRm9yRWxlbWVudCgkc2NvcGUsICRlbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlQ29uZmlndXJhdG9yLmNvbmZpZ3VyZUZvckNvbnRhaW5lcigkc2NvcGUsICRlbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zb3J0YWJsZU9wdGlvbnNbXCJheGlzXCJdID0gXCJ4XCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc29ydGFibGVPcHRpb25zW1widWktZmxvYXRpbmdcIl0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogZW52aXJvbm1lbnQudGVtcGxhdGVVcmwoXCJSb3dcIiksXG4gICAgICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pOyIsImFuZ3VsYXJcbiAgICAubW9kdWxlKFwiTGF5b3V0RWRpdG9yXCIpXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dFBvcHVwXCIsIFtcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByZXN0cmljdDogXCJBXCIsXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcG9wdXAgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHJpZ2dlciA9IHBvcHVwLmNsb3Nlc3QoXCIubGF5b3V0LXBvcHVwLXRyaWdnZXJcIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJlbnRFbGVtZW50ID0gcG9wdXAuY2xvc2VzdChcIi5sYXlvdXQtZWxlbWVudFwiKTtcbiAgICAgICAgICAgICAgICAgICAgdHJpZ2dlci5jbGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb3B1cC50b2dnbGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwb3B1cC5pcyhcIjp2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9wdXAucG9zaXRpb24oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBteTogYXR0cnMub3JjTGF5b3V0UG9wdXBNeSB8fCBcImxlZnQgdG9wXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0OiBhdHRycy5vcmNMYXlvdXRQb3B1cEF0IHx8IFwibGVmdCBib3R0b20rNHB4XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mOiB0cmlnZ2VyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9wdXAuZmluZChcImlucHV0XCIpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHBvcHVwLmNsaWNrKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50RWxlbWVudC5jbGljayhmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9wdXAuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcG9wdXAua2V5ZG93bihmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlLmN0cmxLZXkgJiYgIWUuc2hpZnRLZXkgJiYgIWUuYWx0S2V5ICYmIGUud2hpY2ggPT0gMjcpIC8vIEVzY1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcHVwLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBwb3B1cC5vbihcImN1dCBjb3B5IHBhc3RlXCIsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBbGxvdyBjbGlwYm9hcmQgb3BlcmF0aW9ucyBpbiBwb3B1cCB3aXRob3V0IGludm9raW5nIGNsaXBib2FyZCBldmVudCBoYW5kbGVycyBvbiBwYXJlbnQgZWxlbWVudC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKTsiLCJhbmd1bGFyXG4gICAgLm1vZHVsZShcIkxheW91dEVkaXRvclwiKVxuICAgIC5kaXJlY3RpdmUoXCJvcmNMYXlvdXRUb29sYm94XCIsIFtcIiRjb21waWxlXCIsIFwiZW52aXJvbm1lbnRcIixcbiAgICAgICAgZnVuY3Rpb24gKCRjb21waWxlLCBlbnZpcm9ubWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByZXN0cmljdDogXCJFXCIsXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1wiJHNjb3BlXCIsIFwiJGVsZW1lbnRcIixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSwgJGVsZW1lbnQpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlc2V0RWxlbWVudHMgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZ3JpZEVsZW1lbnRzID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXlvdXRFZGl0b3IuR3JpZC5mcm9tKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hJY29uOiBcIlxcdWYwMGFcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hMYWJlbDogXCJHcmlkXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94RGVzY3JpcHRpb246IFwiRW1wdHkgZ3JpZC5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUucm93RWxlbWVudHMgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIExheW91dEVkaXRvci5Sb3cuZnJvbSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94SWNvbjogXCJcXHVmMGM5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94TGFiZWw6IFwiUm93ICgxIGNvbHVtbilcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hEZXNjcmlwdGlvbjogXCJSb3cgd2l0aCAxIGNvbHVtbi5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBMYXlvdXRFZGl0b3IuQ29sdW1uLnRpbWVzKDEpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXlvdXRFZGl0b3IuUm93LmZyb20oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveEljb246IFwiXFx1ZjBjOVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveExhYmVsOiBcIlJvdyAoMiBjb2x1bW5zKVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveERlc2NyaXB0aW9uOiBcIlJvdyB3aXRoIDIgY29sdW1ucy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBMYXlvdXRFZGl0b3IuQ29sdW1uLnRpbWVzKDIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXlvdXRFZGl0b3IuUm93LmZyb20oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveEljb246IFwiXFx1ZjBjOVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveExhYmVsOiBcIlJvdyAoMyBjb2x1bW5zKVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveERlc2NyaXB0aW9uOiBcIlJvdyB3aXRoIDMgY29sdW1ucy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBMYXlvdXRFZGl0b3IuQ29sdW1uLnRpbWVzKDMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXlvdXRFZGl0b3IuUm93LmZyb20oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveEljb246IFwiXFx1ZjBjOVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveExhYmVsOiBcIlJvdyAoNCBjb2x1bW5zKVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveERlc2NyaXB0aW9uOiBcIlJvdyB3aXRoIDQgY29sdW1ucy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBMYXlvdXRFZGl0b3IuQ29sdW1uLnRpbWVzKDQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXlvdXRFZGl0b3IuUm93LmZyb20oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveEljb246IFwiXFx1ZjBjOVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveExhYmVsOiBcIlJvdyAoNiBjb2x1bW5zKVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveERlc2NyaXB0aW9uOiBcIlJvdyB3aXRoIDYgY29sdW1ucy5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBMYXlvdXRFZGl0b3IuQ29sdW1uLnRpbWVzKDYpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMYXlvdXRFZGl0b3IuUm93LmZyb20oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveEljb246IFwiXFx1ZjBjOVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveExhYmVsOiBcIlJvdyAoMTIgY29sdW1ucylcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hEZXNjcmlwdGlvbjogXCJSb3cgd2l0aCAxMiBjb2x1bW5zLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IExheW91dEVkaXRvci5Db2x1bW4udGltZXMoMTIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLCBMYXlvdXRFZGl0b3IuUm93LmZyb20oe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveEljb246IFwiXFx1ZjBjOVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveExhYmVsOiBcIlJvdyAoZW1wdHkpXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94RGVzY3JpcHRpb246IFwiRW1wdHkgcm93LlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IFtdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jb2x1bW5FbGVtZW50cyA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTGF5b3V0RWRpdG9yLkNvbHVtbi5mcm9tKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hJY29uOiBcIlxcdWYwZGJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hMYWJlbDogXCJDb2x1bW5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xib3hEZXNjcmlwdGlvbjogXCJFbXB0eSBjb2x1bW4uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldDogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY29udGVudEVsZW1lbnRDYXRlZ29yaWVzID0gXygkc2NvcGUuZWxlbWVudC5jb25maWcuY2F0ZWdvcmllcykubWFwKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogY2F0ZWdvcnkubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzOiBfKGNhdGVnb3J5LmNvbnRlbnRUeXBlcykubWFwKGZ1bmN0aW9uIChjb250ZW50VHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0eXBlID0gY29udGVudFR5cGUudHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZmFjdG9yeSA9IExheW91dEVkaXRvci5mYWN0b3JpZXNbdHlwZV0gfHwgTGF5b3V0RWRpdG9yLmZhY3Rvcmllc1tcIkNvbnRlbnRcIl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzVGVtcGxhdGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudFR5cGU6IGNvbnRlbnRUeXBlLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50VHlwZUxhYmVsOiBjb250ZW50VHlwZS5sYWJlbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudFR5cGVDbGFzczogY29udGVudFR5cGUudHlwZUNsYXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNFZGl0b3I6IGNvbnRlbnRUeXBlLmhhc0VkaXRvcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHRtbDogY29udGVudFR5cGUuaHRtbFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBmYWN0b3J5KGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudG9vbGJveEljb24gPSBjb250ZW50VHlwZS5pY29uIHx8IFwiXFx1ZjFjOVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudG9vbGJveExhYmVsID0gY29udGVudFR5cGUubGFiZWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC50b29sYm94RGVzY3JpcHRpb24gPSBjb250ZW50VHlwZS5kZXNjcmlwdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5yZXNldEVsZW1lbnRzKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5nZXRTb3J0YWJsZU9wdGlvbnMgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlZGl0b3JJZCA9ICRlbGVtZW50LmNsb3Nlc3QoXCIubGF5b3V0LWVkaXRvclwiKS5hdHRyKFwiaWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmVudENsYXNzZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBsYWNlaG9sZGVyQ2xhc3NlcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZmxvYXRpbmcgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiR3JpZFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Q2xhc3NlcyA9IFtcIi5sYXlvdXQtY2FudmFzXCIsIFwiLmxheW91dC1jb2x1bW5cIiwgXCIubGF5b3V0LWNvbW1vbi1ob2xkZXJcIl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlckNsYXNzZXMgPSBcImxheW91dC1lbGVtZW50IGxheW91dC1jb250YWluZXIgbGF5b3V0LWdyaWQgdWktc29ydGFibGUtcGxhY2Vob2xkZXJcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiUm93XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRDbGFzc2VzID0gW1wiLmxheW91dC1ncmlkXCJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXJDbGFzc2VzID0gXCJsYXlvdXQtZWxlbWVudCBsYXlvdXQtY29udGFpbmVyIGxheW91dC1yb3cgcm93IHVpLXNvcnRhYmxlLXBsYWNlaG9sZGVyXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkNvbHVtblwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Q2xhc3NlcyA9IFtcIi5sYXlvdXQtcm93Om5vdCgubGF5b3V0LXJvdy1mdWxsKVwiXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyQ2xhc3NlcyA9IFwibGF5b3V0LWVsZW1lbnQgbGF5b3V0LWNvbnRhaW5lciBsYXlvdXQtY29sdW1uIHVpLXNvcnRhYmxlLXBsYWNlaG9sZGVyXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbG9hdGluZyA9IHRydWU7IC8vIFRvIGVuc3VyZSBhIHNtb290aCBob3Jpem9udGFsLWxpc3QgcmVvcmRlcmluZy4gaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXItdWkvdWktc29ydGFibGUjZmxvYXRpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiQ29udGVudFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Q2xhc3NlcyA9IFtcIi5sYXlvdXQtY2FudmFzXCIsIFwiLmxheW91dC1jb2x1bW5cIiwgXCIubGF5b3V0LWNvbW1vbi1ob2xkZXJcIl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlckNsYXNzZXMgPSBcImxheW91dC1lbGVtZW50IGxheW91dC1jb250ZW50IHVpLXNvcnRhYmxlLXBsYWNlaG9sZGVyXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJzb3I6IFwibW92ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0V2l0aDogXyhwYXJlbnRDbGFzc2VzKS5tYXAoZnVuY3Rpb24gKGUpIHsgcmV0dXJuIFwiI1wiICsgZWRpdG9ySWQgKyBcIiBcIiArIGUgKyBcIjpub3QoLmxheW91dC1jb250YWluZXItc2VhbGVkKSA+IC5sYXlvdXQtZWxlbWVudC13cmFwcGVyID4gLmxheW91dC1jaGlsZHJlblwiOyB9KS5qb2luKFwiLCBcIiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBwbGFjZWhvbGRlckNsYXNzZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidWktZmxvYXRpbmdcIjogZmxvYXRpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZTogZnVuY3Rpb24gKGUsIHVpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnRhcmdldC5pc1Rvb2xib3ggPSB0cnVlOyAvLyBXaWxsIGluZGljYXRlIHRvIGNvbm5lY3RlZCBzb3J0YWJsZXMgdGhhdCBkcm9wcGVkIGl0ZW1zIHdlcmUgc2VudCBmcm9tIHRvb2xib3guXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBmdW5jdGlvbiAoZSwgdWkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5lbGVtZW50LmlzRHJhZ2dpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3A6IGZ1bmN0aW9uIChlLCB1aSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmVsZW1lbnQuaXNEcmFnZ2luZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5yZXNldEVsZW1lbnRzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcjogZnVuY3Rpb24gKGUsIHVpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZWxlbWVudC5jYW52YXMuc2V0SXNEcm9wVGFyZ2V0KGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsYXlvdXRJc0NvbGxhcHNlZENvb2tpZU5hbWUgPSBcImxheW91dFRvb2xib3hDYXRlZ29yeV9MYXlvdXRfSXNDb2xsYXBzZWRcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5sYXlvdXRJc0NvbGxhcHNlZCA9ICQuY29va2llKGxheW91dElzQ29sbGFwc2VkQ29va2llTmFtZSkgPT09IFwidHJ1ZVwiO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUudG9nZ2xlTGF5b3V0SXNDb2xsYXBzZWQgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5sYXlvdXRJc0NvbGxhcHNlZCA9ICEkc2NvcGUubGF5b3V0SXNDb2xsYXBzZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJC5jb29raWUobGF5b3V0SXNDb2xsYXBzZWRDb29raWVOYW1lLCAkc2NvcGUubGF5b3V0SXNDb2xsYXBzZWQsIHsgZXhwaXJlczogMzY1IH0pOyAvLyBSZW1lbWJlciBjb2xsYXBzZWQgc3RhdGUgZm9yIGEgeWVhci5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiBlbnZpcm9ubWVudC50ZW1wbGF0ZVVybChcIlRvb2xib3hcIiksXG4gICAgICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRvb2xib3ggPSBlbGVtZW50LmZpbmQoXCIubGF5b3V0LXRvb2xib3hcIik7XG4gICAgICAgICAgICAgICAgICAgICQod2luZG93KS5vbihcInJlc2l6ZSBzY3JvbGxcIiwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYW52YXMgPSBlbGVtZW50LnBhcmVudCgpLmZpbmQoXCIubGF5b3V0LWNhbnZhc1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSBjYW52YXMgaXMgdGFsbGVyIHRoYW4gdGhlIHRvb2xib3gsIG1ha2UgdGhlIHRvb2xib3ggc3RpY2t5LXBvc2l0aW9uZWQgd2l0aGluIHRoZSBlZGl0b3JcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRvIGhlbHAgdGhlIHVzZXIgYXZvaWQgZXhjZXNzaXZlIHZlcnRpY2FsIHNjcm9sbGluZy5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYW52YXNJc1RhbGxlciA9ICEhY2FudmFzICYmIGNhbnZhcy5oZWlnaHQoKSA+IHRvb2xib3guaGVpZ2h0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgd2luZG93UG9zID0gJCh3aW5kb3cpLnNjcm9sbFRvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbnZhc0lzVGFsbGVyICYmIHdpbmRvd1BvcyA+IGVsZW1lbnQub2Zmc2V0KCkudG9wICsgZWxlbWVudC5oZWlnaHQoKSAtIHRvb2xib3guaGVpZ2h0KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94LmFkZENsYXNzKFwic3RpY2t5LWJvdHRvbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94LnJlbW92ZUNsYXNzKFwic3RpY2t5LXRvcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGNhbnZhc0lzVGFsbGVyICYmIHdpbmRvd1BvcyA+IGVsZW1lbnQub2Zmc2V0KCkudG9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveC5hZGRDbGFzcyhcInN0aWNreS10b3BcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbGJveC5yZW1vdmVDbGFzcyhcInN0aWNreS1ib3R0b21cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94LnJlbW92ZUNsYXNzKFwic3RpY2t5LXRvcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sYm94LnJlbW92ZUNsYXNzKFwic3RpY2t5LWJvdHRvbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pOyIsImFuZ3VsYXJcbiAgICAubW9kdWxlKFwiTGF5b3V0RWRpdG9yXCIpXG4gICAgLmRpcmVjdGl2ZShcIm9yY0xheW91dFRvb2xib3hHcm91cFwiLCBbXCIkY29tcGlsZVwiLCBcImVudmlyb25tZW50XCIsXG4gICAgICAgIGZ1bmN0aW9uICgkY29tcGlsZSwgZW52aXJvbm1lbnQpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVzdHJpY3Q6IFwiRVwiLFxuICAgICAgICAgICAgICAgIHNjb3BlOiB7IGNhdGVnb3J5OiBcIj1cIiB9LFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcIiRzY29wZVwiLCBcIiRlbGVtZW50XCIsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsICRlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXNDb2xsYXBzZWRDb29raWVOYW1lID0gXCJsYXlvdXRUb29sYm94Q2F0ZWdvcnlfXCIgKyAkc2NvcGUuY2F0ZWdvcnkubmFtZSArIFwiX0lzQ29sbGFwc2VkXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaXNDb2xsYXBzZWQgPSAkLmNvb2tpZShpc0NvbGxhcHNlZENvb2tpZU5hbWUpID09PSBcInRydWVcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS50b2dnbGVJc0NvbGxhcHNlZCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmlzQ29sbGFwc2VkID0gISRzY29wZS5pc0NvbGxhcHNlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkLmNvb2tpZShpc0NvbGxhcHNlZENvb2tpZU5hbWUsICRzY29wZS5pc0NvbGxhcHNlZCwgeyBleHBpcmVzOiAzNjUgfSk7IC8vIFJlbWVtYmVyIGNvbGxhcHNlZCBzdGF0ZSBmb3IgYSB5ZWFyLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IGVudmlyb25tZW50LnRlbXBsYXRlVXJsKFwiVG9vbGJveEdyb3VwXCIpLFxuICAgICAgICAgICAgICAgIHJlcGxhY2U6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=