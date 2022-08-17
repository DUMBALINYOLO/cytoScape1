import React from "react";
import "./styles.css";
import { Multiselect } from "multiselect-react-dropdown";
import Cytoscape from "cytoscape";
import COSEBilkent from "cytoscape-cose-bilkent";
import GridLayout from "cytoscape-grid-guide";
import CytoscapeComponent from "react-cytoscapejs";
import Cola from "cytoscape-cola";

Cytoscape.use(COSEBilkent);
Cytoscape.use(Cola);
Cytoscape.use(GridLayout);

const layouts = ["cola", "random", "grid", "cose-bilkent"];
const dataPaths = [
  { file: "knowledge_2", adapter: "rich_2" },
  { file: "data", adapter: "basic" },
  { file: "knowledge", adapter: "rich_1" }
];
const allService = { name: "all", id: "all" };
const reduceRelation = (source, list, type) => {
  return list.map((v) => {
    return {
      data: {
        source: source,
        target: v,
        label: type
      }
    };
  });
};

const processData = (data) => {
  const elements = [];
  data.forEach((item) => {
    elements.push({
      data: {
        id: item.name,
        label: item.name
      }
    });
    if (item.hasOwnProperty("usedBy")) {
      elements.push(...reduceRelation(item.name, item.usedBy, "usedBy"));
    }
  });
  return elements;
};

const processDataRich1 = (data) => {
  const categories = [
    "cloud provider",
    "company",
    "compiler",
    "concept",
    "compiler",
    "device",
    "file format",
    "language",
    "library/framework",
    "package manager",
    "runtime",
    "service",
    "standard/protocol",
    "technology",
    "constructor",
    "software program",
    "language",
    "skip",
    "skipreturn",
    "operating system",
    "file format",
    "unknown"
  ];

  const eles = categories.map((c) => ({ data: { id: c, label: c } }));
  const cats = {};
  console.log("Processing:", data);
  Object.keys(data).forEach((key) => {
    const item = data[key];
    if (!cats.hasOwnProperty(item.category)) {
      cats[item.category] = [];
    }
    cats[item.category].push(item.name);
    eles.push({
      data: {
        id: item.name,
        label: item.name,

        style: { "background-color": hashCode(item.name) },
        parent: `parent_${item.category}`
      },
      classes: [item.category]
    });
  });
  console.log("cats:", cats);
  Object.keys(cats).forEach((key) => {
    const group = cats[key];
    group.forEach((catItem) => {
      const target = categories.indexOf(key) !== -1 ? key : "unknown";
      const edge = {
        data: {
          source: catItem,
          target: target
        },
        position: { x: categories.indexOf(key) * 50, y: 0 }
      };
      eles.push(edge);
    });
  });
  return eles;
};

const processDataRich2 = (data, selectedNodes) => {
  const eles = []; //categories.map((c) => ({ data: { id: c, label: c } }));
  const edges = [];
  const cats = {};
  const relatedNodes = {};
  const services = [];
  console.log("Processing:", data, selectedNodes);
  Object.keys(data).forEach((key) => {
    const item = data[key];
    if (item.category === "service") {
      services.push({ name: item.name, id: item.name });
    }

    if (
      selectedNodes[0].name === allService.name ||
      selectedNodes.find((v) => v.name === item.name)
    ) {
      // if (!cats.hasOwnProperty(item.category)) {
      //   cats[item.category] = [];
      // }
      // cats[item.category].push(item.name);
      relatedNodes[item.category] += 1;

      eles.push({
        data: {
          id: item.name,
          label: item.name,

          style: { "background-color": hashCode(item.name) }
          //parent: `${item.category}`,
        },
        classes: [item.category]
      });

      edges.push({
        data: {
          source: item.name,
          target: item.category
        }
      });

      if (item.hasOwnProperty("nearest_concepts")) {
        item.nearest_concepts.forEach((concept) => {
          relatedNodes[concept] += 1;
          edges.push({
            data: {
              source: item.name,
              target: concept
            }
          });
        });
      }
    }
  });

  console.log("Making related nodes");
  Object.keys(relatedNodes).forEach((key) => {
    eles.push({
      data: {
        id: key,
        label: key
      }
    });
  });

  // console.log("cats:", cats);
  // Object.keys(cats).forEach((key) => {
  //   const group = cats[key];
  //   group.forEach((catItem) => {
  //     const target = categories.indexOf(key) !== -1 ? key : "unknown";
  //     const edge = {
  //       data: {
  //         source: catItem,
  //         target: target,
  //       },
  //       position: { x: categories.indexOf(key) * 50, y: 0 },
  //     };
  //     eles.push(edge);
  //   });
  // });
  console.log("Elements:", eles);
  console.log("Edges:", edges);
  return { elements: [...eles, ...edges], services };
};

const formatPath = (p) => `/data/${p}.json`;
const hashCode = (str) => {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

export default function App() {
  const [dataPath, setDataPath] = React.useState(dataPaths[0].file);
  const [selectedLayout, setLayout] = React.useState(layouts[0]);
  const [nodes, setNodes] = React.useState([]);
  const [selectedNodes, setSelectedNodes] = React.useState([]);
  const [servicesList, setServicesList] = React.useState([allService]);
  const [selectedServices, setSelectedServices] = React.useState([allService]);

  const cy = React.useRef();
  React.useEffect(() => {
    if (cy.current) {
      console.log("Drawing layout:", selectedLayout);

      cy.current
        .layout({
          name:
            selectedServices[0].id === allService.id ? "random" : selectedLayout
        })
        .run();
      window.cy = cy.current;
      cy.current.off("taphold", "node").on("taphold", "node", (e) => {
        console.log("clicked", e.target.id());

        setSelectedNodes(
          Array.from(
            new Set([
              ...selectedNodes,
              { name: e.target.id(), id: e.target.id() }
            ])
          )
        );
      });
    }
  }, [nodes, cy, selectedLayout]);
  React.useEffect(() => {
    console.log("Loading: ", formatPath(dataPath));
    const path = dataPaths.find((v) => v.file === dataPath);
    fetch(formatPath(path.file))
      .then((r) => r.json())
      .then((data) => {
        switch (path.adapter) {
          case "basic":
            setNodes(processData(data));
            break;
          case "rich_1":
            setNodes(processDataRich1(data));
            break;
          case "rich_2":
            const { elements, services } = processDataRich2(data, [
              ...selectedNodes,
              ...selectedServices
            ]);
            setServicesList([allService, ...services]);
            setNodes(elements);
            break;
          default:
            break;
        }
      });
  }, [dataPath, selectedServices, selectedNodes]);
  return (
    <div className="App" style={{ width: "100%", height: "100vh" }}>
      <select
        value={dataPath}
        onChange={(e) => setDataPath(e.currentTarget.value)}
      >
        {dataPaths.map((p) => (
          <option value={p.file} key={p.file}>
            {p.file} - {p.adapter}
          </option>
        ))}
      </select>
      {selectedServices[0].id !== allService.id && (
        <select
          value={selectedLayout}
          onChange={(e) => setLayout(e.currentTarget.value)}
        >
          {layouts.map((p) => (
            <option value={p} key={p}>
              {p}
            </option>
          ))}
        </select>
      )}
      {selectedServices[0].id === allService.id && (
        <div>Too many nodes: Random Layout</div>
      )}
      {/* <select
        value={selectedService}
        onChange={(e) => setSelectedService(e.currentTarget.value)}
      >
        {servicesList.map((p) => (
          <option value={p} key={p}>
            {p}
          </option>
        ))}
      </select> */}
      <Multiselect
        options={servicesList}
        selectedValues={selectedServices}
        displayValue="name"
        onSelect={(list) => {
          setSelectedServices(list.filter((v) => v.name !== allService.name));
        }}
        onRemove={(list) =>
          setSelectedServices(list.length === 0 ? [allService] : list)
        }
      ></Multiselect>
      <button
        onClick={() => {
          const name = prompt("Node Name:", "new node");
          if (name !== "") {
            const newId = "n" + String(Math.random()).substr(2, 5);
            const target = nodes
              .filter((v) => !v.data.hasOwnProperty("source"))
              .sort(() => 0.5 - Math.random())
              .slice(0, 1)[0];
            setNodes([
              ...nodes,
              { data: { id: newId, label: name } },
              { data: { source: newId, target: target.data.id } }
            ]);
          }
        }}
      >
        Add node
      </button>
      <button
        onClick={() => {
          if (cy.current) {
            const sel = cy.current.$(":selected");
            if (sel.length === 2) {
              setNodes([
                ...nodes,
                {
                  data: {
                    source: sel[0].data().id,
                    target: sel[1].data().id
                  },
                  classes: ["newEdge"]
                }
              ]);
            }
          }
        }}
      >
        Add relationship
      </button>
      <CytoscapeComponent
        layout={{ name: "cose-bilkent" }}
        cy={(ref) => {
          cy.current = ref;
        }}
        elements={nodes}
        style={{
          width: "100%",
          height: "100vh"
        }}
        stylesheet={[
          {
            selector: "node",
            style: {
              label: "data(id)",
              "background-color": "black"
            }
          },

          {
            selector: "node.service",
            style: {
              label: "data(id)",
              "background-color": "#B9E4FD"
            }
          },
          {
            selector: "node.concept",
            style: {
              label: "data(id)",
              "background-color": "#ADF0C8"
            }
          },
          {
            selector: "node.job_title",
            style: {
              label: "data(id)",
              "background-color": "#FFF380"
            }
          },
          {
            selector: "edge",
            style: {
              "line-color": "#F0F3F5"
            }
          },
          {
            selector: "edge.newEdge",
            style: {
              "line-color": "blue"
            }
          },
          {
            selector: "node:selected",
            style: {
              "background-color": "#FF9466",
              "overlay-color": "blue"
            }
          }
        ]}
      />
    </div>
  );
}
